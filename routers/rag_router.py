from fastapi import APIRouter, Request, File, UploadFile
from use_cases import rag_usecase

router = APIRouter()

@router.post("/api/rag/upload")
async def rag_upload(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        return await rag_usecase.handle_rag_upload(file_bytes, file.filename)
    except Exception as e:
        return {"error": str(e), "success": False}

@router.post("/api/rag/workspace")
async def rag_workspace(request: Request):
    body = await request.json()
    path = body.get("path")
    if not path:
        return {"success": False, "error": "No path provided"}
    return rag_usecase.handle_rag_workspace(path)

@router.get("/api/rag/docs")
async def get_rag_docs():
    docs = rag_usecase.get_rag_docs()
    return {"success": True, "docs": docs}

@router.post("/api/rag/docs/toggle")
async def toggle_rag_doc(request: Request):
    body = await request.json()
    filename = body.get("filename")
    active = body.get("active")
    if filename is None or active is None:
        return {"success": False, "error": "Missing parameters"}
    return rag_usecase.toggle_rag_doc(filename, active)

@router.post("/api/rag/docs/delete")
async def delete_rag_doc(request: Request):
    body = await request.json()
    filename = body.get("filename")
    if not filename:
        return {"success": False, "error": "Missing filename"}
    return rag_usecase.delete_rag_doc(filename)
