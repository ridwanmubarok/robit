import os
import tempfile
from services.rag_service import get_rag_engine

import threading

rag_upload_state = {}

def upload_processing_thread(uid: str, temp_path: str, filename: str):
    engine = get_rag_engine()
    
    def progress_cb(current, total, msg):
        if uid in rag_upload_state:
            rag_upload_state[uid]["progress"] = min(100.0, (current / total) * 100)
            rag_upload_state[uid]["stage_msg"] = msg
            
    def check_cancel_cb():
        if uid in rag_upload_state:
            return rag_upload_state[uid].get("cancel", False)
        return False
        
    try:
        result = engine.ingest_file(temp_path, progress_callback=progress_cb, check_cancel=check_cancel_cb)
        if check_cancel_cb():
            rag_upload_state[uid]["status"] = "canceled"
            rag_upload_state[uid]["stage_msg"] = "Canceled by user"
        elif "Error" in result:
            rag_upload_state[uid]["status"] = "error"
            rag_upload_state[uid]["stage_msg"] = result
        else:
            rag_upload_state[uid]["status"] = "done"
            rag_upload_state[uid]["stage_msg"] = "✅ Berhasil diindeks"
    except Exception as e:
        rag_upload_state[uid]["status"] = "error"
        rag_upload_state[uid]["stage_msg"] = str(e)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

async def handle_rag_upload(file_bytes: bytes, filename: str, uid: str):
    # Save uploaded file temporarily to process it
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"{uid}_{filename}")
    
    with open(temp_path, "wb") as f:
        f.write(file_bytes)
        
    rag_upload_state[uid] = {
        "status": "uploading",
        "progress": 0.0,
        "stage_msg": "Menyiapkan file...",
        "cancel": False
    }
    
    thread = threading.Thread(target=upload_processing_thread, args=(uid, temp_path, filename))
    thread.daemon = True
    thread.start()
    
    return {"success": True, "uid": uid}

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
