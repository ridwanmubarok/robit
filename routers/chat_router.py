from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from services import llm_service
from use_cases import chat_usecase

router = APIRouter()

@router.post("/v1/chat/completions")
async def chat_completions_proxy(request: Request):
    health_ok = await llm_service.check_engine_health()
    if not health_ok:
        return {"error": f"Engine not ready. Status: {llm_service.state.status}"}

    body = await request.json()
    payload = await chat_usecase.prepare_chat_payload(body)

    return StreamingResponse(
        chat_usecase.handle_chat_stream(payload), 
        media_type="text/event-stream"
    )

@router.post("/v1/completions")
async def completions_proxy(request: Request):
    health_ok = await llm_service.check_engine_health()
    if not health_ok:
        return {"error": f"Engine not ready. Status: {llm_service.state.status}"}

    body = await request.json()
    
    async def stream_generator():
        async for chunk in llm_service.stream_llm_response(body):
            yield chunk

    return StreamingResponse(
        stream_generator(), 
        media_type="text/event-stream"
    )
