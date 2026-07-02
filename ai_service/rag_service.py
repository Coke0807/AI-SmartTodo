import re
import traceback
from llm_client import execute_llm


async def query_rag(query: str, doc_content: str, config) -> str:
    """
    Performs a lightweight RAG query on the provided document content.
    Respects the user's AI config mode (local/cloud/hybrid) instead of forcing local.
    """
    mode = getattr(config, "mode", "hybrid").lower() if config else "hybrid"
    model_local = getattr(config, "model_local", "qwen2.5:7b") if config else "qwen2.5:7b"
    model_cloud = getattr(config, "model_cloud", "deepseek-chat") if config else "deepseek-chat"
    print(f"[RAG] Received query. Mode={mode}, local_model={model_local}, cloud_model={model_cloud}")

    if not query or not query.strip():
        raise ValueError("查询内容不能为空")

    if not doc_content or not doc_content.strip():
        # No documents uploaded yet or empty content
        system_prompt = (
            "You are a helpful AI assistant. Answer the user's question directly. "
            "Please note that the user has not uploaded any notes/documents yet."
        )
        print("[RAG] No document content available, answering directly without RAG context.")
        return await execute_llm(config, system_prompt, query, max_tokens=800)

    # Step 1: Chunk the document content by double newlines or paragraphs
    paragraphs = re.split(r'\n\s*\n', doc_content)
    chunks = [p.strip() for p in paragraphs if p.strip()]

    if not chunks:
        chunks = [doc_content.strip()]

    # Step 2: Score chunks based on keyword overlap with the query (TF-IDF style lightweight overlap)
    # Extract clean alphanumeric words from query; also keep CJK characters as separate tokens
    query_tokens = set(_extract_tokens(query.lower()))
    print(f"[RAG] Query tokens: {sorted(query_tokens)}")

    scored_chunks = []
    for chunk in chunks:
        chunk_tokens_list = _extract_tokens(chunk.lower())
        chunk_tokens = set(chunk_tokens_list)

        # Core relevance score: count matches, but weigh matches that appear multiple times
        score = 0
        for token in query_tokens:
            if token in chunk_tokens:
                # Add score proportional to frequency of the token in the chunk
                score += chunk_tokens_list.count(token)

        # Slight length penalty to avoid excessively long paragraphs dominating
        length_penalty = len(chunk_tokens_list) ** 0.1 if chunk_tokens_list else 1
        final_score = score / length_penalty

        scored_chunks.append((final_score, chunk))

    # Sort chunks by score descending
    scored_chunks.sort(key=lambda x: x[0], reverse=True)

    # Retrieve top 3 most relevant chunks with positive score
    top_chunks = [chunk for score, chunk in scored_chunks[:3] if score > 0]

    # If no keyword overlap was found, fall back to the first 3 chunks of the document
    if not top_chunks:
        top_chunks = chunks[:3]
        print("[RAG] No keyword overlap found, falling back to first 3 chunks.")
    else:
        print(f"[RAG] Found {len(top_chunks)} relevant chunks (scores: {[round(s, 3) for s, _ in scored_chunks[:3]]}).")

    context = "\n---\n".join(top_chunks)

    # Step 3: Build the prompt with context
    system_prompt = f"""You are a helpful AI assistant. You are answering questions based ONLY on the user's uploaded notes/documents.
Use the provided context to answer the query as accurately and concisely as possible in the same language as the query (Chinese).
If the answer cannot be found in the context, state clearly that the information is not in the uploaded notes, and then provide a general answer based on your knowledge, clearly distinguishing it from the notes.

Context from user notes:
{context}
"""

    try:
        print(f"[RAG] Querying model with mode={mode}...")
        answer = await execute_llm(config, system_prompt, query, max_tokens=1000)
        print("[RAG] Query completed successfully.")
        return answer
    except Exception as e:
        print(f"[RAG] Model call failed in mode={mode}: {e}")
        traceback.print_exc()
        raise


def _extract_tokens(text: str) -> list:
    """
    Extract alphanumeric words and individual CJK characters as tokens.
    This improves matching for Chinese documents where whitespace segmentation is absent.
    """
    # Alphanumeric words (English, numbers)
    words = re.findall(r'\w+', text)
    # CJK characters as individual tokens
    cjk_chars = re.findall(r'[\u4e00-\u9fff]', text)
    return words + cjk_chars
