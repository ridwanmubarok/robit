import subprocess
import sys
import time
import os
import json
import tempfile
import time
import os
import uvicorn
import httpx
import socket
import threading
import asyncio
import psutil
import urllib.parse
from duckduckgo_search import DDGS
from fastapi import FastAPI, Request, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse
from collections import deque
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import pypdf
import io
import database

database.init_db()

# Load .env configuration
load_dotenv()

# Force UTF-8 for Windows console output
if sys.platform == "win32":
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# ============================================================
# ROGATEKNO LABS - MAX PERFORMANCE ENGINE
# Optimizations:
#   L1 - Engine parameter fine-tuning (ubatch, mmap)
#   L2 - N-Gram Speculative Decoding (no draft model needed)
#   L3 - OS Process Priority HIGH (psutil)
#   L4 - Pre-warming KV Cache on startup
#   L5 - Streaming buffer throttle (reduced syscall overhead)
# ============================================================

# ============================================================
# ROGATEKNO LABS - DUAL MODE ENGINE
# 
# MODE 1: CPU (PrismML 1-bit native)
#   Engine: bin/llama-server.exe
#   Speed: ~2-5 t/s | 1-bit native kernels
#
# MODE 2: GPU Vulkan (AMD RX 580)
#   Engine: bin-vulkan/llama-server.exe
#   Speed: ~5-15 t/s expected | FP16 on GPU
#   Requires: Download from
#   https://github.com/ggml-org/llama.cpp/releases/download/b8838/llama-b8838-bin-win-vulkan-x64.zip
#   Extract to: bin-vulkan/
# ============================================================

# --- Load from .env ---
GPU_MODE = os.getenv("USE_GPU", "false").lower() == "true"
default_model = os.getenv("MODEL_PATH", os.path.join("models", "Bonsai-8B-Q1_0.gguf"))
MODEL_PATH = database.get_setting("active_model", default_model)
LLM_HOST = "127.0.0.1"
LLM_PORT = int(os.getenv("LLM_PORT", 8888))
WEB_PORT = int(os.getenv("WEB_PORT", 8000))
SYSTEM_PROMPT = """You are ROBIT, a Research and Development (R&D) AI assistant from Rogatekno Labs with real-time internet search capabilities.

IDENTITY & CAPABILITIES:
- You perform deep internet research to retrieve the most up-to-date information.
- You can read and retrieve information from internal user documents (PDFs/TXTs) using your RAG database.
- You provide accurate technical analysis for coding, science, and business.
- You optimize coding solutions provided by the user.

TOOL CALLING (Use the following XML tags - MUST BE EXACT):
1.  <search query="topic"/> : Perform an internet search (via DuckDuckGo). Use this to obtain current information, news, or technical documentation that you do not already know.
2.  <ask_docs query="topic"/> : Search the user's internal/local document database (RAG). Use this when the user asks about their own files, PDFs, or books.

OPERATIONAL RULES:
- Provide answers that are TECHNICAL, ACCURATE, and DIRECTLY to the point.
- If you need new information, use the <search> or <ask_docs> tool first. Search results will be provided in the next message as a 'TOOL RESULT'.
- Upon receiving a 'TOOL RESULT', analyze the findings and fulfill the user's request using that data.
- For web development (HTML/CSS), help users optimize their code to look perfect in the UI's PREVIEW feature.

IMPORTANT: Do not provide lengthy explanations while searching. Focus on presenting the research findings."""

THREADS = int(os.getenv("THREADS", 4))
CONTEXT_SIZE = os.getenv("CONTEXT_SIZE", "4096")
BATCH_SIZE = os.getenv("BATCH_SIZE", "1024")
UBATCH_SIZE = os.getenv("UBATCH_SIZE", "512")
GPU_LAYERS = os.getenv("GPU_LAYERS", "99")
GPU_PARALLEL = os.getenv("GPU_PARALLEL", "1")
FLASH_ATTENTION = os.getenv("FLASH_ATTENTION", "on")
KV_QUANT = os.getenv("KV_QUANT", "q4_0")
NGRAM_SPEC = os.getenv("NGRAM_SPEC", "true").lower() == "true"
NGRAM_DRAFT = os.getenv("NGRAM_DRAFT", "8")

# Detection for OS extension
EXT = ".exe" if os.name == "nt" else ""

# GPU Backend Configuration
# Options: cuda | vulkan | metal (default: vulkan)
GPU_BACKEND = os.getenv("GPU_BACKEND", "vulkan").lower()

if GPU_MODE:
    if GPU_BACKEND == "cuda":
        default_dir = "bin-cuda"
        backend_name = "NVIDIA CUDA"
    elif GPU_BACKEND == "metal":
        default_dir = "bin-metal"
        backend_name = "Apple Metal"
    else:
        default_dir = "bin-vulkan"
        backend_name = "Universal Vulkan"
        
    ENGINE_PATH = os.getenv("GPU_ENGINE_PATH", os.path.join(default_dir, f"llama-server{EXT}"))
    print(f"[CONFIG] Mode: GPU {backend_name}")
else:
    ENGINE_PATH = os.getenv("CPU_ENGINE_PATH", os.path.join("bin", f"llama-server{EXT}"))
    print(f"[CONFIG] Mode: CPU 1-Bit Native (PrismML)")

class AppState:
    def __init__(self):
        self.engine_process = None
        self.http_client = httpx.AsyncClient(timeout=None)
        self.status = "Initializing..."
        self.logs = deque(maxlen=50)
        self.is_warmed_up = False
        self.health_client = httpx.AsyncClient(timeout=5.0)

state = AppState()

def is_port_open():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((LLM_HOST, LLM_PORT)) == 0

async def check_engine_health():
    if not is_port_open():
        return False
        
    try:
        # Reuse persistent client for speed
        res = await state.health_client.get(f"http://{LLM_HOST}:{LLM_PORT}/health")
        return res.status_code == 200
    except Exception:
        return False

# --- LAYER 3: OS Process Priority ---
def boost_process_priority(pid):
    """Boost the engine process priority. Handles both Windows and Unix-like systems."""
    try:
        p = psutil.Process(pid)
        if os.name == "nt":
            # Windows: Use high priority class
            p.nice(psutil.HIGH_PRIORITY_CLASS)
        else:
            # Unix/Mac: Use nice value (-10 is high priority, 0 is normal)
            # Negative values usually require sudo, but we'll try -10 first.
            try:
                p.nice(-10)
            except Exception:
                # If -10 fails (no sudo), try 0 (normal) or just skip
                pass
        print("[OPTIM] L3: Engine process priority boosted.")
    except Exception as e:
        print(f"[OPTIM] L3: Could not boost priority (run as admin/sudo for max effect): {e}")

def set_cpu_affinity(pid):
    """Pin the engine to physical cores if supported by the OS."""
    try:
        p = psutil.Process(pid)
        if hasattr(p, "cpu_affinity"):
            # Ryzen 3 3200G has 4 cores, 4 threads (no SMT confusion)
            # We pin to all 4 cores to let the OS handle scheduling cleanly
            p.cpu_affinity(list(range(4)))
            print(f"[OPTIM] L3: CPU affinity pinned to 4 cores.")
        else:
            print("[OPTIM] L3: CPU affinity not supported on this OS.")
    except Exception as e:
        print(f"[OPTIM] L3: Could not set CPU affinity: {e}")

def engine_logger():
    global state
    if not state.engine_process: return
    for line in iter(state.engine_process.stdout.readline, ""):
        clean_line = line.strip()
        if clean_line:
            state.logs.append(clean_line)
            print(f"[ENGINE] {clean_line}")
            if "llama_new_context_with_model: n_ctx" in clean_line:
                state.status = "Preparing Context..."
            elif "warming up the model" in clean_line:
                state.status = "Warming Up Model..."
            elif "HTTP server listening" in clean_line:
                state.status = "Engine Ready - Pre-warming KV Cache..."

# --- LAYER 4: Pre-Warming KV Cache ---
async def prewarm_kv_cache():
    """
    INNOVATION: Send a short dummy inference on startup.
    This pre-loads the system prompt tokens into the KV Cache,
    so every subsequent request benefits from prompt-cache hit.
    Saves ~3-8 seconds off the first user request latency.
    """
    print("[OPTIM] L4: Pre-warming KV Cache with system prompt...")
    await asyncio.sleep(5)  # Wait for engine to fully settle

    payload = {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": "ok"}
        ],
        "max_tokens": 1,
        "stream": False
    }
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"http://{LLM_HOST}:{LLM_PORT}/v1/chat/completions",
                json=payload,
                timeout=30.0
            )
        state.is_warmed_up = True
        state.status = "Ready"
        print("[OPTIM] L4: KV Cache pre-warmed successfully. Engine fully primed.")
    except Exception as e:
        print(f"[OPTIM] L4: Pre-warm failed (non-critical): {e}")
        state.status = "Ready"

def start_engine():
    global MODEL_PATH
    MODEL_PATH = database.get_setting("active_model", default_model)
    
    if not os.path.exists(ENGINE_PATH):
        err = f"Error: Engine not found at {ENGINE_PATH}"
        state.logs.append(err)
        print(err)
        return

    cmd = [
        ENGINE_PATH,
        "-m",     MODEL_PATH,
        "--host", LLM_HOST,
        "--port", str(LLM_PORT),
        "-c",     CONTEXT_SIZE,
        "-t",     str(THREADS),
        "-b",     BATCH_SIZE,
        "-ub",    UBATCH_SIZE,
        "--no-webui",
    ]

    if GPU_MODE:
        cmd += [
            "-ngl",  GPU_LAYERS,
            "-fa",   FLASH_ATTENTION,
            "--parallel", GPU_PARALLEL,
            "--mmap",
        ]
        print(f"[OPTIM] GPU Mode: {GPU_LAYERS} layers -> Vulkan | {GPU_PARALLEL} parallel slot(s) | OS Paging Active")
    else:
        cmd += [
            "-ngl",  "0",
            "-fa",   FLASH_ATTENTION,
            "-ctk",  KV_QUANT,
            "-ctv",  KV_QUANT,
            "--mmap",
            "--no-warmup",
        ]
        if NGRAM_SPEC:
            cmd += ["--spec-type", "ngram-simple", "--draft", NGRAM_DRAFT]
            print(f"[OPTIM] CPU Mode: N-Gram Speculative Decoding active (draft={NGRAM_DRAFT})")

    state.engine_process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    threading.Thread(target=engine_logger, daemon=True).start()
    boost_process_priority(state.engine_process.pid)
    
    if not GPU_MODE:
        set_cpu_affinity(state.engine_process.pid)
        
    state.is_warmed_up = False

def stop_engine():
    if state.engine_process:
        state.engine_process.terminate()
        try:
            state.engine_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            state.engine_process.kill()
        state.engine_process = None
        state.status = "Engine Stopped"

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Rogatekno Labs - Max Performance Mode Initializing...")

    if not os.path.exists(ENGINE_PATH):
        err = f"Error: Engine not found at {ENGINE_PATH}"
        state.logs.append(err)
        print(err)
        yield
        return

    # Automatically set execution permissions for Mac/Linux
    if os.name != "nt":
        try:
            os.chmod(ENGINE_PATH, 0o755)
            print(f"[INIT] Permissions set for {ENGINE_PATH}")
            
            # macOS Security Policy Bypass
            if os.uname().sysname == "Darwin":
                # 1. Recursive remove quarantine
                bin_dir = os.path.dirname(ENGINE_PATH)
                subprocess.run(["xattr", "-cr", bin_dir], capture_output=True)
                # 2. Ad-hoc sign libraries and binary
                subprocess.run(f"codesign --force --sign - {bin_dir}/*.dylib 2>/dev/null", shell=True, capture_output=True)
                subprocess.run(["codesign", "--force", "--sign", "-", ENGINE_PATH], capture_output=True)
                print(f"[INIT] macOS security policy bypassed (xattr/codesign)")
        except Exception as e:
            print(f"[INIT] Warning: Could not set permissions or sign binary: {e}")

    start_engine()

    state.status = "Loading Model..."

    # Wait for the engine port to open, then pre-warm
    async def wait_and_prewarm():
        for _ in range(120):
            if is_port_open():
                asyncio.create_task(prewarm_kv_cache())
                return
            await asyncio.sleep(1)

    asyncio.create_task(wait_and_prewarm())

    yield

    stop_engine()
    await state.http_client.aclose()

app = FastAPI(lifespan=lifespan)

@app.post("/v1/chat/completions")
async def chat_proxy(request: Request):
    health_ok = await check_engine_health()
    if not health_ok:
        return {"error": f"Engine not ready. Status: {state.status}"}

    body = await request.json()

    messages = body.get("messages", [])
    system_msg = next((m for m in messages if m.get("role") == "system"), None)
    if system_msg:
        if "INTERNAL SYSTEM DIRECTIVES" not in system_msg["content"]:
            system_msg["content"] = system_msg["content"] + "\n\n--- INTERNAL SYSTEM DIRECTIVES ---\n" + SYSTEM_PROMPT
    else:
        messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})
    
    body["messages"] = messages

    url = f"http://{LLM_HOST}:{LLM_PORT}/v1/chat/completions"

    try:
        req = state.http_client.build_request("POST", url, json=body)
        response = await state.http_client.send(req, stream=True)

        if response.status_code != 200:
            content = await response.aread()
            await response.aclose()
            return {"error": f"Engine error {response.status_code}: {content.decode()}"}

        async def stream_generator():
            try:
                # LAYER 5: Low-latency streaming
                async for chunk in response.aiter_bytes():
                    if chunk:
                        yield chunk
            finally:
                await response.aclose()

        return StreamingResponse(
            stream_generator(), 
            media_type=response.headers.get("content-type", "application/json")
        )
    except Exception as e:
        return {"error": f"Failed to connect to Engine: {str(e)}"}

@app.post("/v1/completions")
async def completions_proxy(request: Request):
    """Proxy for standard OpenAI completions (used for Autocomplete FIM)"""
    health_ok = await check_engine_health()
    if not health_ok:
        return {"error": f"Engine not ready. Status: {state.status}"}

    body = await request.json()
    url = f"http://{LLM_HOST}:{LLM_PORT}/v1/completions"

    try:
        req = state.http_client.build_request("POST", url, json=body)
        response = await state.http_client.send(req, stream=True)

        if response.status_code != 200:
            content = await response.aread()
            await response.aclose()
            return {"error": f"Engine error {response.status_code}: {content.decode()}"}

        async def stream_generator():
            try:
                async for chunk in response.aiter_bytes():
                    if chunk:
                        yield chunk
            finally:
                await response.aclose()

        return StreamingResponse(
            stream_generator(), 
            media_type=response.headers.get("content-type", "application/json")
        )
    except Exception as e:
        return {"error": f"Failed to connect to Engine: {str(e)}"}

@app.get("/v1/models")
async def models_proxy():
    is_ready = await check_engine_health()
    
    if is_ready:
        state.status = "Ready"
    else:
        if is_port_open():
            state.status = "Engine Busy/Loading..."
        else:
            state.status = "Connecting..."

    return {
        "status": state.status,
        "is_ready": is_ready,
        "logs": list(state.logs)[-5:],
        "object": "list",
        "data": [
            {
                "id": MODEL_PATH.split("/")[-1].split("\\")[-1] if MODEL_PATH else "robit-model",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "rogatekno",
                "root": MODEL_PATH.split("/")[-1].split("\\")[-1] if MODEL_PATH else "robit-model",
                "parent": None
            }
        ]
    }

@app.get("/favicon.ico")
async def favicon():
    return HTMLResponse(content="", status_code=204)

@app.post("/api/extract")
async def extract_text(file: UploadFile = File(...)):
    """
    Extract text content from uploaded files (PDF, TXT, Code).
    """
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
            from rapidocr_onnxruntime import RapidOCR
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

        print(f"[FILES] Extracted {len(content)} chars from {filename}")

        return {
            "filename": filename,
            "text": content,
            "success": True if content else False,
            "error": "No text found in file" if not content else None
        }
    except Exception as e:
        print(f"[FILES] Error extracting {filename}: {e}")
        return {"error": str(e), "success": False}

@app.post("/api/fs/ls")
async def fs_ls(request: Request):
    body = await request.json()
    path = body.get("path", ".")
    try:
        # Restriction removed per user request for full system access
        full_path = os.path.abspath(path)
        
        items = os.listdir(full_path)
        return {"items": items, "success": True}
    except Exception as e:
        return {"error": str(e), "success": False}

@app.post("/api/fs/read")
async def fs_read(request: Request):
    body = await request.json()
    path = body.get("path")
    try:
        # Normalize and unquote path (e.g. %20 -> space, file:/// -> cleaned)
        clean_path = urllib.parse.unquote(path)
        if clean_path.startswith("file:///"):
            clean_path = clean_path[8:] if os.name != 'nt' else clean_path[8:].lstrip('/')
            
        full_path = os.path.abspath(clean_path)
        
        # Handle PDF Read
        if full_path.lower().endswith(".pdf"):
            content = ""
            with open(full_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for page in reader.pages:
                    text = page.extract_text()
                    if text: content += text + "\n"
            return {"content": content, "success": True}
            
        # Handle Text/Code Read
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"content": content, "success": True}
    except Exception as e:
        return {"error": str(e), "success": False}

@app.post("/api/fs/search")
async def fs_search(request: Request):
    body = await request.json()
    query = body.get("query")
    try:
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=5):
                # Use Markdown formatting for clickable links
                md_link = f"### [{r.get('title')}]({r.get('href')})\n{r.get('body')}"
                results.append(md_link)
        
        content = "\n\n---\n\n".join(results)
        return {"content": content, "success": True}
    except Exception as e:
        return {"error": str(e), "success": False}

@app.post("/api/fs/write")
async def fs_write(request: Request):
    body = await request.json()
    path = body.get("path")
    content = body.get("content", "")
    try:
        full_path = os.path.abspath(path)
        
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[AGENT] Wrote file: {path}")
        return {"success": True}
    except Exception as e:
        return {"error": str(e), "success": False}

@app.get("/api/history")
async def get_history():
    sessions = database.get_all_sessions()
    active = database.get_setting("active_session", None)
    return {"active_session": active, "sessions": sessions}

@app.post("/api/history")
async def save_history(request: Request):
    body = await request.json()
    active_session = body.get("active_session")
    sessions = body.get("sessions", {})
    if active_session:
        database.set_setting("active_session", active_session)
    database.save_all_sessions(sessions)
    return {"success": True}

@app.get("/api/models")
async def get_models():
    models_dir = "models"
    available = []
    if os.path.exists(models_dir):
        for f in os.listdir(models_dir):
            if f.endswith(".gguf"):
                available.append(f)
    active_model = os.path.basename(database.get_setting("active_model", default_model))
    return {"success": True, "models": available, "active": active_model}

@app.post("/api/settings/model")
async def set_model(request: Request):
    body = await request.json()
    model_name = body.get("model")
    if not model_name:
        return {"success": False, "error": "Model name required"}
    
    full_path = os.path.join("models", model_name)
    if not os.path.exists(full_path):
        return {"success": False, "error": "Model file not found"}
        
    database.set_setting("active_model", full_path)
    stop_engine()
    start_engine()
    # Trigger a new KV cache warm-up since the engine restarted
    asyncio.create_task(prewarm_kv_cache())
    return {"success": True}

@app.post("/api/rag/upload")
async def rag_upload(file: UploadFile = File(...)):
    try:
        from rag import get_rag_engine
        engine = get_rag_engine()
        
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, file.filename)
        
        with open(temp_path, "wb") as f:
            f.write(await file.read())
            
        result = engine.ingest_file(temp_path)
        os.remove(temp_path)
        
        return {"success": True, "message": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/rag/docs")
async def get_rag_docs():
    try:
        from rag import get_rag_engine
        engine = get_rag_engine()
        return {"success": True, "docs": engine.list_documents()}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/rag/docs/delete")
async def delete_rag_doc(request: Request):
    body = await request.json()
    filename = body.get("filename")
    if not filename:
        return {"success": False, "error": "No filename provided"}
    try:
        from rag import get_rag_engine
        engine = get_rag_engine()
        deleted_chunks = engine.delete_document(filename)
        return {"success": True, "deleted_chunks": deleted_chunks}
    except Exception as e:
        return {"success": False, "error": str(e)}

app.mount("/", StaticFiles(directory="ui/dist", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=WEB_PORT)
