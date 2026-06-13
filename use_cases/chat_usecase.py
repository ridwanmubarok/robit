import json
from services import llm_service, db_service
from core.config import DEFAULT_SYSTEM_PROMPT

async def prepare_chat_payload(body: dict):
    # Retrieve active system prompt
    chat_mode = body.get("chat_mode", "all")
    
    if chat_mode == "standard":
        system_prompt = (
            "You are ROBIT, an advanced AI assistant from Rogatekno Labs.\n"
            "Provide helpful, accurate, and direct answers using your general knowledge.\n"
            "IMPORTANT: You are in Standard Chat mode. Do NOT use any tool calling XML tags "
            "(such as <search>, <scrape>, or <ask_docs>). Do not attempt to search the web or knowledge base."
        )
    elif chat_mode == "research":
        system_prompt = (
            "You are ROBIT, an advanced AI assistant from Rogatekno Labs with real-time internet search and web scraping capabilities.\n\n"
            "IDENTITY & CAPABILITIES:\n"
            "- You perform deep internet research to retrieve the most up-to-date information.\n"
            "- You can scrape and read content from ANY public URL (articles, product pages, documentation, marketplaces, etc.).\n"
            "- IMPORTANT: Do NOT use the <ask_docs> tag. The local document database is disabled in this mode.\n\n"
            "TOOL CALLING (Use the following XML tags — MUST BE EXACT, self-closing):\n"
            "1. <search query=\"your search topic\"/> — Perform an internet search (DuckDuckGo). Use for current information, news, technical docs, or finding URLs.\n"
            "2. <scrape url=\"https://full-url-here\" query=\"what you are looking for\"/> — Scrape a webpage and extract content relevant to your query.\n\n"
            "TOOL WORKFLOW:\n"
            "- First use <search> to find relevant URLs, then use <scrape> on the most relevant URL to get detailed content.\n"
            "- Upon receiving a 'TOOL RESULT', analyze the data thoroughly and respond to the user.\n"
            "IMPORTANT: Do not explain that you are searching. Just use the tool tag immediately, then wait for the TOOL RESULT."
        )
    elif chat_mode == "rag":
        system_prompt = (
            "You are ROBIT, an advanced AI assistant from Rogatekno Labs with internal user documents retrieval (RAG) capabilities.\n\n"
            "IDENTITY & CAPABILITIES:\n"
            "- You can read and retrieve information from internal user documents (PDFs/TXTs) using your RAG database.\n"
            "- IMPORTANT: Do NOT use the <search> or <scrape> tags. Web search is disabled in this mode.\n\n"
            "TOOL CALLING (Use the following XML tag — MUST BE EXACT, self-closing):\n"
            "1. <ask_docs query=\"your question\"/> — Search the user's internal/local document database (RAG). Use when the user asks about their own files, PDFs, or uploaded documents.\n\n"
            "TOOL WORKFLOW:\n"
            "- Use the <ask_docs> tag to query the database, then answer the user based on the retrieved document context.\n"
            "IMPORTANT: Do not explain that you are searching. Just use the tool tag immediately, then wait for the TOOL RESULT."
        )
    else: # "all"
        system_prompt = db_service.get_setting("system_prompt", DEFAULT_SYSTEM_PROMPT)

    messages = body.get("messages", [])
    
    # Ensure system prompt is the first message
    if not messages or messages[0].get("role") != "system":
        messages.insert(0, {"role": "system", "content": system_prompt})
    else:
        messages[0]["content"] = system_prompt

    # --- CHAT HISTORY RAG ---
    MAX_HISTORY = 10
    RETAIN_LATEST = 4
    if len(messages) > MAX_HISTORY + 1:  # +1 for system prompt
        try:
            import numpy as np
            from services import rag_service
            
            # Extract latest query
            latest_query = ""
            for m in reversed(messages):
                if m.get("role") == "user":
                    latest_query = m.get("content", "")
                    break
                    
            if latest_query:
                sys_msg = messages[0]
                latest_msgs = messages[-RETAIN_LATEST:]
                old_msgs = messages[1:-RETAIN_LATEST]
                
                texts = []
                for m in old_msgs:
                    content = m.get("content", "").strip()
                    if content:
                        texts.append(f"[{m.get('role', 'unknown').upper()}] {content}")
                        
                if texts:
                    rag_engine = rag_service.get_rag_engine()
                    query_vec = rag_engine.model.encode([latest_query], convert_to_numpy=True)
                    doc_vecs = rag_engine.model.encode(texts, convert_to_numpy=True)
                    
                    # Cosine similarity
                    norm_q = np.linalg.norm(query_vec, axis=1)
                    norm_d = np.linalg.norm(doc_vecs, axis=1)
                    norm_q[norm_q == 0] = 1e-10
                    norm_d[norm_d == 0] = 1e-10
                    
                    sim = np.dot(query_vec, doc_vecs.T) / (norm_q[:, None] * norm_d)
                    sim = sim[0]
                    
                    top_k = min(3, len(texts))
                    top_indices = np.argsort(sim)[-top_k:][::-1]
                    
                    retrieved_memory = []
                    for idx in top_indices:
                        if sim[idx] > 0.15: # Context threshold
                            retrieved_memory.append(texts[idx])
                            
                    if retrieved_memory:
                        memory_context = "\n\n[MEMORI PERCAKAPAN LAMA YANG RELEVAN]\n"
                        memory_context += "\n---\n".join(retrieved_memory)
                        sys_msg["content"] += memory_context
                        
                # Reconstruct messages to avoid context explosion
                messages = [sys_msg] + latest_msgs
        except Exception as e:
            print(f"[CHAT RAG] Error embedding history: {e}")
            messages = [messages[0]] + messages[-RETAIN_LATEST:]

    temperature = float(db_service.get_setting("temperature", "0.3"))
    top_p = float(db_service.get_setting("top_p", "0.9"))
    
    payload = {
        "messages": messages,
        "temperature": temperature,
        "top_p": top_p,
        "stream": True,
        "cache_prompt": True,
        "frequency_penalty": 0.5,
        "presence_penalty": 0.2,
        "repeat_penalty": 1.15,
        "stop": ["<|eot_id|>", "<|im_end|>", "</s>", "<|end_of_text|>", "User:", "\nuser", "\nYou", "\n<|user|>"]
    }
    
    return payload

async def handle_chat_stream(payload: dict):
    async for chunk in llm_service.stream_llm_response(payload):
        yield chunk
