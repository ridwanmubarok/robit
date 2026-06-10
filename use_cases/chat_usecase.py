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
            "2. <scrape url=\"https://full-url-here\"/> — Scrape and read the content of a specific webpage.\n\n"
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

    temperature = float(db_service.get_setting("temperature", "0.3"))
    top_p = float(db_service.get_setting("top_p", "0.9"))
    
    payload = {
        "messages": messages,
        "temperature": temperature,
        "top_p": top_p,
        "stream": True,
        "cache_prompt": True
    }
    
    return payload

async def handle_chat_stream(payload: dict):
    async for chunk in llm_service.stream_llm_response(payload):
        yield chunk
