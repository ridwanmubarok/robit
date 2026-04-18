import subprocess
import time
import os
import uvicorn
import httpx
import socket
import threading
import asyncio
import psutil
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse
from collections import deque
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load .env configuration
load_dotenv()

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
MODEL_PATH = os.getenv("MODEL_PATH", os.path.join("models", "Bonsai-8B-Q1_0.gguf"))
LLM_HOST = "127.0.0.1"
LLM_PORT = int(os.getenv("LLM_PORT", 8888))
WEB_PORT = int(os.getenv("WEB_PORT", 8000))
SYSTEM_PROMPT = "You are a highly capable research assistant at Rogatekno Labs."

THREADS = int(os.getenv("THREADS", 4))
CONTEXT_SIZE = os.getenv("CONTEXT_SIZE", "2048")
BATCH_SIZE = os.getenv("BATCH_SIZE", "1024")
UBATCH_SIZE = os.getenv("UBATCH_SIZE", "512")
GPU_LAYERS = os.getenv("GPU_LAYERS", "99")
FLASH_ATTENTION = os.getenv("FLASH_ATTENTION", "on")
KV_QUANT = os.getenv("KV_QUANT", "q4_0")
NGRAM_SPEC = os.getenv("NGRAM_SPEC", "true").lower() == "true"
NGRAM_DRAFT = os.getenv("NGRAM_DRAFT", "8")

if GPU_MODE:
    ENGINE_PATH = os.getenv("GPU_ENGINE_PATH", os.path.join("bin-vulkan", "llama-server.exe"))
    print("[CONFIG] Mode: GPU Vulkan (AMD RX 580)")
else:
    ENGINE_PATH = os.getenv("CPU_ENGINE_PATH", os.path.join("bin", "llama-server.exe"))
    print("[CONFIG] Mode: CPU 1-Bit Native (PrismML)")

class AppState:
    def __init__(self):
        self.engine_process = None
        self.http_client = httpx.AsyncClient(timeout=None)
        self.status = "Initializing..."
        self.logs = deque(maxlen=50)
        self.is_warmed_up = False

state = AppState()

def is_port_open():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((LLM_HOST, LLM_PORT)) == 0

async def check_engine_health():
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"http://{LLM_HOST}:{LLM_PORT}/v1/models", timeout=2.0)
            return res.status_code == 200
        except:
            return False

# --- LAYER 3: OS Process Priority ---
def boost_process_priority(pid):
    """Boost the engine process to HIGH priority on Windows."""
    try:
        p = psutil.Process(pid)
        p.nice(psutil.HIGH_PRIORITY_CLASS)
        print("[OPTIM] L3: Engine process priority boosted to HIGH.")
    except Exception as e:
        print(f"[OPTIM] L3: Could not boost priority (run as admin for max effect): {e}")

def set_cpu_affinity(pid):
    """Pin the engine to physical cores (0,2,4,6 on Ryzen 3 = 4 physical cores)."""
    try:
        p = psutil.Process(pid)
        # Ryzen 3 3200G has 4 cores, 4 threads (no SMT confusion)
        # We pin to all 4 cores to let the OS handle scheduling cleanly
        p.cpu_affinity(list(range(4)))
        print(f"[OPTIM] L3: CPU affinity pinned to 4 cores.")
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
                state.status = "Engine Ready — Pre-warming KV Cache..."

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
        "max_tokens": 1,  # Only generate 1 token — just to prime the cache
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Rogatekno Labs — Max Performance Mode Initializing...")

    if not os.path.exists(ENGINE_PATH):
        err = f"Error: Engine not found at {ENGINE_PATH}"
        state.logs.append(err)
        print(err)
        yield
        return

    # =====================================================================
    # LAYER 1: Fine-tuned Engine Parameters
    # LAYER 2: N-Gram Speculative Decoding (--spec-type ngram-simple)
    # =====================================================================
    threads = 4  # Optimal for Ryzen 3 3200G (4 physical cores)

    # Base command (shared between CPU and GPU modes)
    cmd = [
        ENGINE_PATH,
        "-m",     MODEL_PATH,
        "--host", LLM_HOST,
        "--port", str(LLM_PORT),
        "-c",     CONTEXT_SIZE,
        "-t",     str(THREADS),
        "-b",     BATCH_SIZE,
        "-ub",    UBATCH_SIZE,
    ]

    if GPU_MODE:
        cmd += [
            "-ngl",  GPU_LAYERS,
            "-fa",   FLASH_ATTENTION,
            "--mmap",
        ]
        print(f"[OPTIM] GPU Mode: Offloading {GPU_LAYERS} layers to Vulkan (AMD RX 580)")
    else:
        cmd += [
            "-ngl",  "0",
            "-fa",   FLASH_ATTENTION,
            "-ctk",  KV_QUANT,
            "-ctv",  KV_QUANT,
            "--mmap",
            "--mlock",
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

    # LAYER 3: Boost OS process priority
    boost_process_priority(state.engine_process.pid)
    set_cpu_affinity(state.engine_process.pid)

    log_thread = threading.Thread(target=engine_logger, daemon=True)
    log_thread.start()

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

    if state.engine_process:
        state.engine_process.terminate()
    await state.http_client.aclose()

app = FastAPI(lifespan=lifespan)

@app.post("/v1/chat/completions")
async def chat_proxy(request: Request):
    health_ok = await check_engine_health()
    if not health_ok:
        return {"error": f"Engine not ready. Status: {state.status}"}

    body = await request.json()

    # Inject system prompt if not already present
    messages = body.get("messages", [])
    if not any(m.get("role") == "system" for m in messages):
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

        # LAYER 5: Buffered streaming (reduce flush syscall overhead)
        async def stream_generator():
            buffer = ""
            try:
                async for chunk in response.aiter_lines():
                    if chunk:
                        buffer += chunk + "\n"
                        # Flush when buffer hits threshold OR it's the [DONE] sentinel
                        if len(buffer) >= 256 or "[DONE]" in chunk:
                            yield buffer
                            buffer = ""
                if buffer:
                    yield buffer
            finally:
                await response.aclose()

        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    except Exception as e:
        return {"error": f"Failed to connect to Engine: {str(e)}"}

@app.get("/v1/models")
async def models_proxy():
    is_ready = await check_engine_health()
    if is_ready:
        state.status = "Ready" if state.is_warmed_up else "Engine Ready — Pre-warming..."

    return {
        "status": state.status,
        "is_ready": is_ready,
        "logs": list(state.logs)[-5:]
    }

app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=WEB_PORT)
