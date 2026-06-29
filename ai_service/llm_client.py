import traceback
import json
from openai import OpenAI

def execute_llm(config, system_prompt, user_prompt, response_format=None, max_tokens=1000):
    """
    Executes LLM completion based on the config.
    Supports local, cloud, and hybrid modes.
    In hybrid mode, it tries cloud first, and falls back to local on failure.
    """
    # Safeguard if config is None
    if not config:
        print("[LLM] Warning: No configuration provided. Using default hybrid settings.")
        class DefaultConfig:
            mode = "hybrid"
            local_endpoint = "http://localhost:11434"
            cloud_endpoint = "https://api.deepseek.com/v1"
            api_key = ""
            model_local = "qwen2.5:7b"
            model_cloud = "deepseek-chat"
        config = DefaultConfig()

    mode = getattr(config, "mode", "hybrid").lower()
    local_endpoint = getattr(config, "local_endpoint", "http://localhost:11434")
    cloud_endpoint = getattr(config, "cloud_endpoint", "https://api.deepseek.com/v1")
    api_key = getattr(config, "api_key", "")
    model_local = getattr(config, "model_local", "qwen2.5:7b")
    model_cloud = getattr(config, "model_cloud", "deepseek-chat")

    if not local_endpoint:
        local_endpoint = "http://localhost:11434"
    if not cloud_endpoint:
        cloud_endpoint = "https://api.deepseek.com/v1"
    if not model_local:
        model_local = "qwen3.5:9b"
    if not model_cloud:
        model_cloud = "deepseek-chat"

    if mode == "local":
        return _call_local(local_endpoint, model_local, system_prompt, user_prompt, response_format, max_tokens)
    elif mode == "cloud":
        return _call_cloud(cloud_endpoint, api_key, model_cloud, system_prompt, user_prompt, response_format, max_tokens)
    else:  # hybrid
        try:
            print(f"[LLM] Hybrid mode: Attempting cloud model ({model_cloud}) at {cloud_endpoint}...")
            return _call_cloud(cloud_endpoint, api_key, model_cloud, system_prompt, user_prompt, response_format, max_tokens)
        except Exception as e:
            print(f"[LLM] Cloud model call failed: {e}. Falling back to local model ({model_local}) at {local_endpoint}...")
            traceback.print_exc()
            return _call_local(local_endpoint, model_local, system_prompt, user_prompt, response_format, max_tokens)

def _call_local(endpoint, model, system_prompt, user_prompt, response_format, max_tokens):
    base_url = endpoint.rstrip('/')
    if not base_url.endswith('/v1'):
        base_url = f"{base_url}/v1"
    
    print(f"[LLM] Calling local model '{model}' at '{base_url}'...")
    client = OpenAI(
        base_url=base_url,
        api_key="ollama",  # Ollama doesn't require key, but OpenAI client needs non-empty placeholder
        timeout=30.0
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    kwargs = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
    }
    if response_format:
        kwargs["response_format"] = response_format
        
    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content

def _call_cloud(endpoint, api_key, model, system_prompt, user_prompt, response_format, max_tokens):
    if not api_key:
        raise ValueError("Cloud API Key is empty. Cannot call cloud model.")
        
    base_url = endpoint.rstrip('/')
    print(f"[LLM] Calling cloud model '{model}' at '{base_url}'...")
    client = OpenAI(
        base_url=base_url,
        api_key=api_key,
        timeout=30.0
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    kwargs = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
    }
    if response_format:
        kwargs["response_format"] = response_format
        
    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content


def execute_llm_stream(config, system_prompt, user_prompt, max_tokens=1000):
    """
    Generator that yields SSE-formatted chunks for streaming chat responses.
    Follows the same hybrid/local/cloud routing logic as execute_llm.
    """
    if not config:
        class DefaultConfig:
            mode = "hybrid"
            local_endpoint = "http://localhost:11434"
            cloud_endpoint = "https://api.deepseek.com/v1"
            api_key = ""
            model_local = "qwen3.5:9b"
            model_cloud = "deepseek-chat"
        config = DefaultConfig()

    mode = getattr(config, "mode", "hybrid").lower()
    local_endpoint = getattr(config, "local_endpoint", "http://localhost:11434")
    cloud_endpoint = getattr(config, "cloud_endpoint", "https://api.deepseek.com/v1")
    api_key = getattr(config, "api_key", "")
    model_local = getattr(config, "model_local", "qwen3.5:9b")
    model_cloud = getattr(config, "model_cloud", "deepseek-chat")

    if not local_endpoint:
        local_endpoint = "http://localhost:11434"
    if not cloud_endpoint:
        cloud_endpoint = "https://api.deepseek.com/v1"
    if not model_local:
        model_local = "qwen3.5:9b"
    if not model_cloud:
        model_cloud = "deepseek-chat"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    def _stream_from_provider(endpoint, api_key_val, model):
        base_url = endpoint.rstrip('/')
        if not base_url.endswith('/v1'):
            base_url = f"{base_url}/v1"
        client = OpenAI(base_url=base_url, api_key=api_key_val or "ollama", timeout=60.0)
        stream = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            stream=True,
        )
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"

    try:
        if mode == "local":
            yield from _stream_from_provider(local_endpoint, "ollama", model_local)
        elif mode == "cloud":
            yield from _stream_from_provider(cloud_endpoint, api_key, model_cloud)
        else:  # hybrid
            # Why: Buffer cloud tokens to avoid partial output on failure.
            # Only flush to client after cloud stream completes successfully.
            # If cloud fails mid-stream, discard buffer and restart with local model.
            try:
                print(f"[LLM-SSE] Hybrid: attempting cloud ({model_cloud})...")
                cloud_buffer = []
                for chunk in _stream_from_provider(cloud_endpoint, api_key, model_cloud):
                    cloud_buffer.append(chunk)
                # Cloud succeeded — flush all buffered chunks
                for chunk in cloud_buffer:
                    yield chunk
            except Exception as e:
                print(f"[LLM-SSE] Cloud failed: {e}. Falling back to local ({model_local})...")
                traceback.print_exc()
                # Discard any partial cloud output, restart from local
                yield from _stream_from_provider(local_endpoint, "ollama", model_local)
    except Exception as e:
        print(f"[LLM-SSE] Streaming error: {e}")
        traceback.print_exc()
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"
