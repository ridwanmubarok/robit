import json
from services import llm_service, db_service
from core.config import DEFAULT_SYSTEM_PROMPT

async def prepare_chat_payload(body: dict):
    # Retrieve active system prompt
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
