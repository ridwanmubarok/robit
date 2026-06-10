from fastapi import APIRouter, Request, File, UploadFile
from fastapi.responses import HTMLResponse
import time
import os
import pypdf
import io
import urllib.parse
from rapidocr_onnxruntime import RapidOCR
from ddgs import DDGS

from services import db_service, llm_service
from services.rag_service import get_rag_engine
from core.config import DEFAULT_MODEL

router = APIRouter()

@router.post("/api/search")
async def search_web(request: Request):
    """DuckDuckGo web search for ROBIT tool calls."""
    body = await request.json()
    query = body.get("query", "").strip()
    if not query:
        return {"success": False, "error": "No query provided", "results": ""}
    try:
        with DDGS() as ddgs:
            raw = list(ddgs.text(query, max_results=6))
        if not raw:
            return {"success": True, "results": "Tidak ada hasil ditemukan untuk query tersebut."}
        lines = []
        for i, r in enumerate(raw, 1):
            lines.append(f"{i}. **{r.get('title', '')}**\n   {r.get('href', '')}\n   {r.get('body', '')}")
        return {"success": True, "results": "\n\n".join(lines)}
    except Exception as e:
        return {"success": False, "error": str(e), "results": f"Search error: {e}"}

@router.post("/api/rag/query")
async def rag_query(request: Request):
    """Query the RAG knowledge base."""
    body = await request.json()
    query = body.get("query", "").strip()
    top_k = int(body.get("top_k", 3))
    if not query:
        return {"success": False, "results": "No query provided"}
    try:
        engine = get_rag_engine()
        results = engine.search(query, k=top_k)
        return {"success": True, "results": results or "Tidak ada dokumen relevan ditemukan."}
    except Exception as e:
        return {"success": False, "results": f"RAG error: {e}"}



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

@router.post("/api/translate")
async def translate_endpoint(request: Request):
    body = await request.json()
    text = body.get("text", "").strip()
    source_lang = body.get("source_lang", "Auto").strip()
    target_lang = body.get("target_lang", "Indonesian").strip()
    
    if not text:
        return {"success": False, "error": "Teks sumber tidak boleh kosong."}
        
    try:
        result = await llm_service.translate_text(text, source_lang, target_lang)
        return {
            "success": True,
            "translation": result.get("translation", ""),
            "replies": result.get("replies", [])
        }
    except Exception as e:
        # Fallback: if JSON parse fails or LLM has error, return raw error or mock replies
        return {
            "success": False,
            "error": f"Gagal menerjemahkan: {str(e)}"
        }

@router.post("/api/planning/generate")
async def generate_planning_endpoint(request: Request):
    body = await request.json()
    feature_name = body.get("feature_name", "").strip()
    tech_stack = body.get("tech_stack", "").strip()
    requirements = body.get("requirements", "").strip()
    files_scope = body.get("files_scope", "").strip()
    target_dir = body.get("target_dir", "").strip()
    
    if not feature_name:
        return {"success": False, "error": "Nama fitur tidak boleh kosong."}
    if not requirements:
        return {"success": False, "error": "Deskripsi kebutuhan tidak boleh kosong."}
        
    try:
        # Resolve target directory
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__))))
        if not target_dir or target_dir == ".":
            resolved_dir = workspace_root
        elif os.path.isabs(target_dir):
            resolved_dir = os.path.abspath(target_dir)
        else:
            resolved_dir = os.path.abspath(os.path.join(workspace_root, target_dir))

        # Context Size Budgeting to prevent llama-server HTTP 400 Errors
        from core.config import CONTEXT_SIZE
        max_context_size = int(db_service.get_setting("context_size", CONTEXT_SIZE))
        
        # We leave at least 3000 tokens for model output.
        max_prompt_tokens = max(2000, max_context_size - 3000)
        # 1 token is ~3.2 characters for code/configs (conservative estimate)
        max_prompt_chars = int(max_prompt_tokens * 3.2)
        
        fixed_overhead = 2500 # Instructions, metadata, system prompts
        req_len = len(requirements)
        
        if req_len > 6000:
            requirements = requirements[:6000] + "\n... [Deskripsi dipotong karena terlalu panjang] ..."
            req_len = len(requirements)
            
        available_chars = max_prompt_chars - fixed_overhead - req_len
        if available_chars < 1500:
            available_chars = 1500 # Fallback minimum budget
            
        # Allocate 75% for source files, 25% for semantic RAG blocks
        rag_budget = max(1000, min(3000, int(available_chars * 0.25)))
        files_budget = max(1000, available_chars - rag_budget)

        # Search codebase RAG if active/indexed
        codebase_rag_context = ""
        auto_files = []
        try:
            from services.rag_service import get_codebase_rag_engine
            db = get_codebase_rag_engine()
            if db.chunk_map:
                search_query = f"{feature_name} {requirements}"
                results = db.search(search_query, k=4)
                if results and "Database is empty" not in results:
                    # Truncate RAG context to fit budget
                    if len(results) > rag_budget:
                        codebase_rag_context = results[:rag_budget] + "\n... [Konteks RAG dipotong untuk hemat memori] ..."
                    else:
                        codebase_rag_context = results
                    
                    # Extract auto files for scope if files_scope is empty
                    chunks = results.split("\n\n---\n\n")
                    for chunk in chunks:
                        if chunk.startswith("[Source: "):
                            end_idx = chunk.find("]")
                            if end_idx != -1:
                                source_file = chunk[9:end_idx]
                                if source_file not in auto_files:
                                    auto_files.append(source_file)
                    auto_files = auto_files[:4]
        except Exception as re:
            print(f"[PLANNING] Codebase RAG search error: {re}")

        # If files_scope is empty, use auto-detected files
        files_to_read = []
        effective_scope = files_scope
        if files_scope:
            files_to_read = [f.strip() for f in files_scope.replace(";", ",").split(",")]
        elif auto_files:
            files_to_read = auto_files
            effective_scope = ", ".join(auto_files)
            print(f"[PLANNING] Auto-detected files scope: {effective_scope}")

        # Read files context
        files_context = ""
        if files_to_read:
            # Filter out node_modules and check paths
            files_to_read = [f for f in files_to_read if "node_modules" not in f.split(os.sep)]
            
            if files_to_read:
                per_file_budget = max(1024, files_budget // len(files_to_read))
                
                for file_item in files_to_read:
                    if not file_item:
                        continue
                    if "node_modules" in file_item.split(os.sep):
                        continue
                        
                    # Resolve path
                    if os.path.isabs(file_item):
                        file_path = os.path.abspath(file_item)
                    else:
                        file_path = os.path.abspath(os.path.join(resolved_dir, file_item))
                        
                    if os.path.exists(file_path) and os.path.isfile(file_path):
                        try:
                            file_size = os.path.getsize(file_path)
                            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                                if file_size > per_file_budget:
                                    file_content = f.read(per_file_budget) + "\n... [Konten file dipotong untuk hemat konteks] ..."
                                else:
                                    file_content = f.read()
                            
                            files_context += f"\nFile: {file_item}\n```\n{file_content}\n```\n"
                        except Exception as fe:
                            files_context += f"\nFile: {file_item} (Gagal membaca: {str(fe)})\n"
                    else:
                        files_context += f"\nFile: {file_item} (Berkas tidak ditemukan)\n"

        # Auto-detect tech stack if not specified
        effective_tech_stack = tech_stack
        if not effective_tech_stack:
            effective_tech_stack = detect_tech_stack(resolved_dir)
            print(f"[PLANNING] Auto-detected tech stack: {effective_tech_stack}")

        plan = await llm_service.generate_coding_plan(feature_name, effective_tech_stack, requirements, effective_scope, files_context, codebase_rag_context)
        return {
            "success": True,
            "plan": plan
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Gagal men-generate coding plan: {str(e)}"
        }

@router.post("/api/planning/index-codebase")
async def index_codebase_endpoint(request: Request):
    body = await request.json()
    target_dir = body.get("target_dir", ".").strip()
    
    try:
        # Resolve target directory
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__))))
        
        if not target_dir or target_dir == ".":
            resolved_dir = workspace_root
        elif os.path.isabs(target_dir):
            resolved_dir = os.path.abspath(target_dir)
        else:
            resolved_dir = os.path.abspath(os.path.join(workspace_root, target_dir))
            
        if not os.path.exists(resolved_dir) or not os.path.isdir(resolved_dir):
            return {"success": False, "error": f"Direktori {resolved_dir} tidak ditemukan."}
            
        # Get codebase RAG engine
        from services.rag_service import get_codebase_rag_engine
        import asyncio
        
        # Run indexing in a background thread as it can be slow
        db = get_codebase_rag_engine()
        result_msg = await asyncio.to_thread(db.ingest_workspace, resolved_dir)
        
        return {
            "success": True,
            "message": result_msg
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Gagal mengindeks codebase: {str(e)}"
        }

@router.post("/api/planning/detect-files")
async def detect_files_endpoint(request: Request):
    body = await request.json()
    feature_name = body.get("feature_name", "").strip()
    requirements = body.get("requirements", "").strip()
    
    if not requirements:
        return {"success": False, "error": "Kebutuhan fitur tidak boleh kosong."}
        
    try:
        from services.rag_service import get_codebase_rag_engine
        db = get_codebase_rag_engine()
        
        if not db.chunk_map:
            return {"success": True, "files": []}
            
        # Run search query on the codebase index
        search_query = f"{feature_name} {requirements}"
        # Fetch top 12 chunks to extract unique sources
        results = db.search(search_query, k=12)
        
        # Parse sources
        detected_files = []
        if results and "Database is empty" not in results:
            chunks = results.split("\n\n---\n\n")
            for chunk in chunks:
                if chunk.startswith("[Source: "):
                    end_idx = chunk.find("]")
                    if end_idx != -1:
                        source_file = chunk[9:end_idx]
                        if source_file not in detected_files:
                            detected_files.append(source_file)
                            
        # Return top 4 unique files
        return {
            "success": True,
            "files": detected_files[:4]
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Gagal mendeteksi file: {str(e)}"
        }

def detect_tech_stack(workspace_path: str) -> str:
    techs = []
    
    # 1. Check Python dependencies
    req_txt = os.path.join(workspace_path, "requirements.txt")
    if os.path.exists(req_txt):
        techs.append("Python")
        try:
            with open(req_txt, "r", encoding="utf-8", errors="replace") as f:
                content = f.read().lower()
                if "fastapi" in content: techs.append("FastAPI")
                elif "django" in content: techs.append("Django")
                elif "flask" in content: techs.append("Flask")
                if "sqlite" in content: techs.append("SQLite")
                if "postgresql" in content or "psycopg" in content: techs.append("PostgreSQL")
        except Exception:
            pass
            
    # 2. Check Node.js dependencies
    pkg_json = os.path.join(workspace_path, "package.json")
    pkg_json_subs = [
        pkg_json,
        os.path.join(workspace_path, "ui", "package.json"),
        os.path.join(workspace_path, "frontend", "package.json")
    ]
    for pj in pkg_json_subs:
        if os.path.exists(pj):
            if "Node.js" not in techs: techs.append("Node.js")
            try:
                with open(pj, "r", encoding="utf-8", errors="replace") as f:
                    data = json.load(f)
                    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                    if "react" in deps: techs.append("React")
                    if "vue" in deps: techs.append("Vue")
                    if "astro" in deps: techs.append("Astro")
                    if "next" in deps: techs.append("Next.js")
                    if "tailwindcss" in deps: techs.append("Tailwind CSS")
                    if "express" in deps: techs.append("Express")
                    if "typescript" in deps: techs.append("TypeScript")
            except Exception:
                pass
                
    # 3. Check Go modules
    go_mod = os.path.join(workspace_path, "go.mod")
    if os.path.exists(go_mod):
        techs.append("Go")
        
    # 4. Check Rust Cargo
    cargo_toml = os.path.join(workspace_path, "Cargo.toml")
    if os.path.exists(cargo_toml):
        techs.append("Rust")
        
    # Remove duplicates and return comma separated
    unique_techs = []
    for t in techs:
        if t not in unique_techs:
            unique_techs.append(t)
            
    return ", ".join(unique_techs) if unique_techs else "Not detected"

@router.post("/api/planning/detect-tech")
async def detect_tech_endpoint(request: Request):
    body = await request.json()
    target_dir = body.get("target_dir", ".").strip()
    
    try:
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__))))
        if not target_dir or target_dir == ".":
            resolved_dir = workspace_root
        elif os.path.isabs(target_dir):
            resolved_dir = os.path.abspath(target_dir)
        else:
            resolved_dir = os.path.abspath(os.path.join(workspace_root, target_dir))
            
        if not os.path.exists(resolved_dir) or not os.path.isdir(resolved_dir):
            return {"success": False, "error": f"Direktori {resolved_dir} tidak ditemukan."}
            
        tech_stack = detect_tech_stack(resolved_dir)
        return {
            "success": True,
            "tech_stack": tech_stack
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/api/planning/select-dir")
async def select_dir_endpoint():
    try:
        import tkinter as tk
        from tkinter import filedialog
        import asyncio
        
        def ask_dir():
            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)
            selected = filedialog.askdirectory(title="Pilih Direktori Penyimpanan")
            root.destroy()
            return selected
            
        selected_dir = await asyncio.to_thread(ask_dir)
        return {"success": True, "directory": selected_dir}
    except Exception as e:
        return {"success": False, "error": f"Gagal membuka folder picker: {str(e)}"}

@router.post("/api/planning/save")
async def save_planning_endpoint(request: Request):
    body = await request.json()
    filename = body.get("filename", "implementation_plan.md").strip()
    target_dir = body.get("target_dir", ".").strip()
    content = body.get("content", "").strip()
    
    if not content:
        return {"success": False, "error": "Konten tidak boleh kosong."}
    if not filename:
        filename = "implementation_plan.md"
        
    try:
        # Resolve target directory
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__))))
        
        if not target_dir or target_dir == ".":
            resolved_dir = workspace_root
        elif os.path.isabs(target_dir):
            resolved_dir = os.path.abspath(target_dir)
        else:
            resolved_dir = os.path.abspath(os.path.join(workspace_root, target_dir))
            
        target_path = os.path.join(resolved_dir, filename)
        
        # Ensure target folder exists
        os.makedirs(resolved_dir, exist_ok=True)
        
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(content)
            
        return {
            "success": True,
            "filepath": target_path,
            "filename": filename,
            "directory": resolved_dir
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Gagal menyimpan file: {str(e)}"
        }


