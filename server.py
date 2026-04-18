import subprocess
import time
import os
import uvicorn
import httpx
import socket
import threading
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse
from collections import deque
from contextlib import asynccontextmanager

# Configuration
MODEL_PATH = os.path.join("models", "Bonsai-8B-Q1_0.gguf")
ENGINE_PATH = os.path.join("bin", "llama-server.exe")
LLM_HOST = "127.0.0.1"
LLM_PORT = 8888
WEB_PORT = 8000

# Global state
class AppState:
    def __init__(self):
        self.engine_process = None
        self.http_client = httpx.AsyncClient(timeout=None)
        self.status = "Inisialisasi..."
        self.logs = deque(maxlen=50) # Store last 50 lines of logs

state = AppState()

def is_engine_ready():
    """Check if the llama-server port is open."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((LLM_HOST, LLM_PORT)) == 0

async def check_engine_health():
    """Verify if engine returns 200 OK on its health endpoint."""
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"http://{LLM_HOST}:{LLM_PORT}/v1/models", timeout=1.0)
            return res.status_code == 200
        except:
            return False

def engine_logger():
    """Reads engine output and prints to console + storage."""
    global state
    if not state.engine_process: return
    
    for line in iter(state.engine_process.stdout.readline, ""):
        clean_line = line.strip()
        if clean_line:
            state.logs.append(clean_line)
            print(f"[ENGINE] {clean_line}")
            
            # Smart status detection
            if "llama_new_context_with_model: n_ctx" in clean_line:
                state.status = "Menyiapkan Konteks..."
            elif "warming up the model" in clean_line:
                state.status = "Pemanasan Model (Sabar ya...)"
            elif "HTTP server listening" in clean_line:
                state.status = "Engine Siap (Tunggu Pemanasan)"

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Mengaktifkan Engine PrismML (Optimasi 1-Bit)...")
    
    if not os.path.exists(ENGINE_PATH):
        err = f"Error: Engine tidak ditemukan di {ENGINE_PATH}"
        state.logs.append(err)
        print(err)
        yield
        return

    # TurboQuant & CPU Speed Optimizations
    # 4 threads often performs better on 8-thread laptops (avoids cache contention)
    threads = 4 
    
    cmd = [
        ENGINE_PATH,
        "-m", MODEL_PATH,
        "--host", LLM_HOST,
        "--port", str(LLM_PORT),
        "-ngl", "0",          # CPU Only
        "-c", "2048",         # Context size
        "-t", str(threads),   # Optimized Thread count
        "-b", "512",          # Batch size
        "-fa", "on",          # Flash Attention (Turbo boost)
        "-ctk", "q4_0",       # TurboQuant: Key Cache Quantization
        "-ctv", "q4_0",       # TurboQuant: Value Cache Quantization
        "--no-warmup",        # Skip slow startup warmup
        "--mlock"             # Stay in pinned memory
    ]
    
    # Start with stdout pipe to capture logs
    state.engine_process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    # Start logger thread
    log_thread = threading.Thread(target=engine_logger, daemon=True)
    log_thread.start()
    
    state.status = "Memuat Model..."
    yield
    
    # Cleanup
    if state.engine_process:
        state.engine_process.terminate()
    await state.http_client.aclose()

app = FastAPI(lifespan=lifespan)

@app.post("/v1/chat/completions")
async def chat_proxy(request: Request):
    # Double check health
    health_ok = await check_engine_health()
    if not health_ok:
        return {"error": f"Model sedang pemanasan atau belum siap. Status: {state.status}"}
    
    body = await request.json()
    url = f"http://{LLM_HOST}:{LLM_PORT}/v1/chat/completions"
    
    try:
        # Create request but don't close it automatically with a context manager here
        req = state.http_client.build_request("POST", url, json=body)
        response = await state.http_client.send(req, stream=True)
        
        if response.status_code != 200:
            content = await response.aread()
            await response.aclose()
            return {"error": f"Engine error {response.status_code}: {content.decode()}"}
        
        async def stream_generator():
            try:
                async for chunk in response.aiter_lines():
                    if chunk:
                        yield f"{chunk}\n"
            finally:
                # Ensure we close the connection AFTER streaming is done
                await response.aclose()
                
        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    except Exception as e:
        return {"error": f"Gagal terhubung ke Engine: {str(e)}"}

@app.get("/v1/models")
async def models_proxy():
    is_ready = await check_engine_health()
    if is_ready: 
        state.status = "Ready"
    
    return {
        "status": state.status,
        "is_ready": is_ready,
        "logs": list(state.logs)[-5:]
    }

# Static files
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=WEB_PORT)
