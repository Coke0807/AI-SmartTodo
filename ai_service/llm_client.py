import traceback
import json
from openai import AsyncOpenAI

# Why: 12-Factor compliance — reuse cached client instances to avoid
# per-request TCP handshake overhead and reduce GC pressure.
_client_cache = {}

def _get_client(base_url: str, api_key: str, timeout: float) -> AsyncOpenAI:
    """
    Returns a cached AsyncOpenAI client for the given endpoint.
    Why: OpenAI client holds an httpx connection pool; creating one per request
    wastes resources and prevents connection reuse.
    """
    cache_key = (base_url, api_key)
    if cache_key not in _client_cache:
        _client_cache[cache_key] = AsyncOpenAI(
            base_url=base_url,
            api_key=api_key,
            timeout=timeout,
        )
    return _client_cache[cache_key]

async def execute_llm(config, system_prompt, user_prompt, response_format=None, max_tokens=1000):
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
        model_local = "qwen2.5:7b"
    if not model_cloud:
        model_cloud = "deepseek-chat"

    print(f"[LLM] Resolved config: mode={mode}, local_model={model_local}, cloud_model={model_cloud}")

    if mode == "local":
        return await _call_local(local_endpoint, model_local, system_prompt, user_prompt, response_format, max_tokens)
    elif mode == "cloud":
        return await _call_cloud(cloud_endpoint, api_key, model_cloud, system_prompt, user_prompt, response_format, max_tokens)
    else:  # hybrid
        try:
            print(f"[LLM] Hybrid mode: Attempting cloud model ({model_cloud}) at {cloud_endpoint}...")
            return await _call_cloud(cloud_endpoint, api_key, model_cloud, system_prompt, user_prompt, response_format, max_tokens)
        except Exception as e:
            print(f"[LLM] Cloud model call failed: {e}. Falling back to local model ({model_local}) at {local_endpoint}...")
            traceback.print_exc()
            return await _call_local(local_endpoint, model_local, system_prompt, user_prompt, response_format, max_tokens)

async def _call_local(endpoint, model, system_prompt, user_prompt, response_format, max_tokens):
    base_url = endpoint.rstrip('/')
    if not base_url.endswith('/v1'):
        base_url = f"{base_url}/v1"

    print(f"[LLM] Calling local model '{model}' at '{base_url}'...")
    client = _get_client(base_url, "ollama", 120.0)

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

    try:
        response = await client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content
        print(f"[LLM] Local model '{model}' returned {len(content)} chars.")
        return content
    except Exception as e:
        print(f"[LLM] Local model '{model}' call failed: {e}")
        traceback.print_exc()
        raise RuntimeError(f"本地模型调用失败 ({model} @ {base_url}): {e}") from e

async def _call_cloud(endpoint, api_key, model, system_prompt, user_prompt, response_format, max_tokens):
    if not api_key:
        raise ValueError("Cloud API Key is empty. Cannot call cloud model.")

    base_url = endpoint.rstrip('/')
    print(f"[LLM] Calling cloud model '{model}' at '{base_url}'...")
    client = _get_client(base_url, api_key, 90.0)

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

    try:
        response = await client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content
        print(f"[LLM] Cloud model '{model}' returned {len(content)} chars.")
        return content
    except Exception as e:
        print(f"[LLM] Cloud model '{model}' call failed: {e}")
        traceback.print_exc()
        raise RuntimeError(f"云端模型调用失败 ({model} @ {base_url}): {e}") from e


async def execute_llm_stream(config, system_prompt, user_prompt, max_tokens=1000):
    """
    Async generator that yields SSE-formatted chunks for streaming chat responses.
    Follows the same hybrid/local/cloud routing logic as execute_llm.
    """
    if not config:
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
        model_local = "qwen2.5:7b"
    if not model_cloud:
        model_cloud = "deepseek-chat"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    async def _stream_from_provider(endpoint, api_key_val, model):
        base_url = endpoint.rstrip('/')
        if not base_url.endswith('/v1'):
            base_url = f"{base_url}/v1"
        # Why: Streaming connections need longer timeout to accommodate
        # model loading, inference, and network variability.
        client = _get_client(base_url, api_key_val or "ollama", 180.0)
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"

    try:
        if mode == "local":
            async for chunk in _stream_from_provider(local_endpoint, "ollama", model_local):
                yield chunk
        elif mode == "cloud":
            async for chunk in _stream_from_provider(cloud_endpoint, api_key, model_cloud):
                yield chunk
        else:  # hybrid
            # Why: Buffer cloud tokens to avoid partial output on failure.
            # Only flush to client after cloud stream completes successfully.
            # If cloud fails mid-stream, discard buffer and restart with local model.
            try:
                print(f"[LLM-SSE] Hybrid: attempting cloud ({model_cloud})...")
                cloud_buffer = []
                async for chunk in _stream_from_provider(cloud_endpoint, api_key, model_cloud):
                    cloud_buffer.append(chunk)
                # Cloud succeeded — flush all buffered chunks
                for chunk in cloud_buffer:
                    yield chunk
            except Exception as e:
                print(f"[LLM-SSE] Cloud failed: {e}. Falling back to local ({model_local})...")
                traceback.print_exc()
                # Discard any partial cloud output, restart from local
                async for chunk in _stream_from_provider(local_endpoint, "ollama", model_local):
                    yield chunk
    except Exception as e:
        print(f"[LLM-SSE] Streaming error: {e}")
        traceback.print_exc()
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"
