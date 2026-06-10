from fastapi import APIRouter, Request, File, UploadFile
from fastapi.responses import HTMLResponse
import time
import os
import pypdf
import io
import urllib.parse
from rapidocr_onnxruntime import RapidOCR

from services import db_service, llm_service
from core.config import DEFAULT_MODEL

router = APIRouter()

@router.get("/v1/models")
async def models_proxy():
    is_ready = await llm_service.check_engine_health()
    
    if is_ready:
        llm_service.state.status = "Ready"
    else:
        if llm_service.is_port_open():
            llm_service.state.status = "Engine Busy/Loading..."
        else:
            llm_service.state.status = "Connecting..."

    models_list = llm_service.get_models_list()
    active_model = db_service.get_setting("active_model", DEFAULT_MODEL)

    return {
        "status": llm_service.state.status,
        "is_ready": is_ready,
        "logs": list(llm_service.state.logs)[-5:],
        "object": "list",
        "data": models_list,
        "active_model": active_model
    }

@router.get("/api/settings/advanced")
async def get_advanced_settings():
    from core.config import CONTEXT_SIZE, DEFAULT_SYSTEM_PROMPT
    return {
        "temperature": float(db_service.get_setting("temperature", "0.3")),
        "top_p": float(db_service.get_setting("top_p", "0.9")),
        "context_size": int(db_service.get_setting("context_size", CONTEXT_SIZE)),
        "system_prompt": db_service.get_setting("system_prompt", DEFAULT_SYSTEM_PROMPT)
    }

@router.post("/api/settings/advanced")
async def set_advanced_settings(request: Request):
    data = await request.json()
    
    need_restart = False
    if "context_size" in data:
        old_ctx = int(db_service.get_setting("context_size", "4096"))
        new_ctx = int(data["context_size"])
        if old_ctx != new_ctx:
            need_restart = True
        db_service.set_setting("context_size", str(new_ctx))
        
    if "temperature" in data:
        db_service.set_setting("temperature", str(data["temperature"]))
    if "top_p" in data:
        db_service.set_setting("top_p", str(data["top_p"]))
    if "system_prompt" in data:
        db_service.set_setting("system_prompt", data["system_prompt"])
        
    if need_restart:
        llm_service.stop_engine()
        llm_service.start_engine()
        
    return {"success": True, "restarted": need_restart}

@router.post("/api/settings/model")
async def set_active_model(request: Request):
    data = await request.json()
    model = data.get("model")
    if model:
        db_service.set_setting("active_model", model)
        llm_service.stop_engine()
        llm_service.start_engine()
        return {"success": True, "message": "Model changed and engine restarted."}
    return {"success": False, "error": "No model provided"}

@router.get("/api/history")
async def get_history():
    sessions = db_service.get_all_sessions()
    active = db_service.get_setting("active_session", "")
    return {"active_session": active, "sessions": sessions}

@router.post("/api/history")
async def save_history(request: Request):
    data = await request.json()
    active_session = data.get("active_session")
    sessions = data.get("sessions", {})
    if active_session:
        db_service.set_setting("active_session", active_session)
    db_service.save_all_sessions(sessions)
    return {"success": True}

@router.post("/api/extract")
async def extract_text(file: UploadFile = File(...)):
    content = ""
    filename = file.filename
    extension = filename.split(".")[-1].lower() if "." in filename else ""

    try:
        file_bytes = await file.read()
        if extension == "pdf":
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    content += text + "\n"
        elif extension in ["png", "jpg", "jpeg", "webp", "bmp"]:
            ocr = RapidOCR()
            result, _ = ocr(file_bytes)
            if result:
                for idx in range(len(result)):
                    content += result[idx][1] + "\n"
        else:
            raw_text = file_bytes.decode("utf-8", errors="replace")
            content = "\n".join([line.strip() for line in raw_text.split("\n") if line.strip()])

        if len(content) > 15000:
            content = content[:15000] + "... [Content Truncated]"

        return {
            "filename": filename,
            "text": content,
            "success": True if content else False,
            "error": "No text found in file" if not content else None
        }
    except Exception as e:
        return {"error": str(e), "success": False}

@router.post("/api/fs/ls")
async def fs_ls(request: Request):
    body = await request.json()
    path = body.get("path", ".")
    try:
        full_path = os.path.abspath(path)
        items = os.listdir(full_path)
        return {"items": items, "success": True}
    except Exception as e:
        return {"error": str(e), "success": False}

@router.post("/api/fs/read")
async def fs_read(request: Request):
    body = await request.json()
    path = body.get("path")
    try:
        clean_path = urllib.parse.unquote(path)
        if clean_path.startswith("file:///"):
            clean_path = clean_path[8:] if os.name != 'nt' else clean_path[8:].lstrip('/')
        full_path = os.path.abspath(clean_path)
        if full_path.lower().endswith(".pdf"):
            content = ""
            with open(full_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for page in reader.pages:
                    text = page.extract_text()
                    if text: content += text + "\n"
            return {"content": content, "success": True}
        else:
            with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            return {"content": content, "success": True}
    except Exception as e:
        return {"error": str(e), "success": False}
