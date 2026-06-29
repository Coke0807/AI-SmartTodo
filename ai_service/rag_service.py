import re
from llm_client import execute_llm

def query_rag(query: str, doc_content: str, config) -> str:
    """
    Performs a lightweight RAG query on the provided document content.
    Forces the use of the local Ollama model for processing.
    """
    if not doc_content or not doc_content.strip():
        # No documents uploaded yet or empty content
        system_prompt = (
            "You are a helpful AI assistant. Answer the user's question directly. "
            "Please note that the user has not uploaded any notes/documents yet."
        )
        local_config = _force_local_config(config)
        return execute_llm(local_config, system_prompt, query, max_tokens=800)

    # Step 1: Chunk the document content by double newlines or paragraphs
    paragraphs = re.split(r'\n\s*\n', doc_content)
    chunks = [p.strip() for p in paragraphs if p.strip()]
    
    if not chunks:
        chunks = [doc_content.strip()]
    
    # Step 2: Score chunks based on keyword overlap with the query (TF-IDF style lightweight overlap)
    # Extract clean alphanumeric words from query
    query_words = set(re.findall(r'\w+', query.lower()))
    
    scored_chunks = []
    for chunk in chunks:
        chunk_words_list = re.findall(r'\w+', chunk.lower())
        chunk_words = set(chunk_words_list)
        
        # Core relevance score: count matches, but weigh matches that appear multiple times
        score = 0
        for word in query_words:
            if word in chunk_words:
                # Add score proportional to frequency of the word in the chunk
                score += chunk_words_list.count(word)
                
        # Slight length penalty to avoid excessively long paragraphs dominating
        length_penalty = len(chunk_words_list) ** 0.1 if chunk_words_list else 1
        final_score = score / length_penalty
        
        scored_chunks.append((final_score, chunk))
        
    # Sort chunks by score descending
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    # Retrieve top 3 most relevant chunks with positive score
    top_chunks = [chunk for score, chunk in scored_chunks[:3] if score > 0]
    
    # If no keyword overlap was found, fall back to the first 3 chunks of the document
    if not top_chunks:
        top_chunks = chunks[:3]
        
    context = "\n---\n".join(top_chunks)
    
    # Step 3: Build the prompt with context
    system_prompt = f"""You are a helpful AI assistant. You are answering questions based ONLY on the user's uploaded notes/documents.
Use the provided context to answer the query as accurately and concisely as possible in the same language as the query (Chinese).
If the answer cannot be found in the context, state clearly that the information is not in the uploaded notes, and then provide a general answer based on your knowledge, clearly distinguishing it from the notes.

Context from user notes:
{context}
"""

    # Force local mode for RAG (Ollama)
    local_config = _force_local_config(config)
    
    print(f"[RAG] Found {len(top_chunks)} relevant chunks. Querying local model...")
    return execute_llm(local_config, system_prompt, query, max_tokens=1000)

def _force_local_config(config):
    """
    Creates a copy of the config and overrides the mode to 'local'.
    """
    class LocalConfig:
        mode = "local"
        local_endpoint = getattr(config, "local_endpoint", "http://localhost:11434")
        cloud_endpoint = getattr(config, "cloud_endpoint", "https://api.deepseek.com/v1")
        api_key = getattr(config, "api_key", "")
        model_local = getattr(config, "model_local", "qwen2.5:7b")
        model_cloud = getattr(config, "model_cloud", "deepseek-chat")
        
    return LocalConfig()
