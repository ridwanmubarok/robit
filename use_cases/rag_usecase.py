import os
import tempfile
from services.rag_service import get_rag_engine

async def handle_rag_upload(file_bytes: bytes, filename: str):
    engine = get_rag_engine()
    
    # Save uploaded file temporarily to process it
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, filename)
    
    with open(temp_path, "wb") as f:
        f.write(file_bytes)
        
    try:
        result = engine.ingest_file(temp_path)
        if "Error" in result:
            return {"success": False, "error": result}
        return {"success": True, "message": result}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def handle_rag_workspace(path: str):
    engine = get_rag_engine()
    result = engine.ingest_workspace(path)
    if "Error" in result:
        return {"success": False, "error": result}
    return {"success": True, "message": result}

def get_rag_docs():
    engine = get_rag_engine()
    return engine.list_documents()

def toggle_rag_doc(filename: str, active: bool):
    engine = get_rag_engine()
    engine.toggle_document(filename, active)
    return {"success": True}

def delete_rag_doc(filename: str):
    engine = get_rag_engine()
    deleted_chunks = engine.delete_document(filename)
    return {"success": True, "deleted_chunks": deleted_chunks}
