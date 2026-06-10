import subprocess
import os
import time
import socket
import threading
import asyncio
import psutil
import json
from collections import deque
import httpx

from core.config import (
    GPU_MODE, LLM_HOST, LLM_PORT, THREADS, CONTEXT_SIZE, 
    BATCH_SIZE, UBATCH_SIZE, GPU_LAYERS, GPU_PARALLEL, 
    FLASH_ATTENTION, KV_QUANT, NGRAM_SPEC, NGRAM_DRAFT, DEFAULT_SYSTEM_PROMPT
)
from services import db_service

EXT = ".exe" if os.name == "nt" else ""
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
else:
    ENGINE_PATH = os.getenv("CPU_ENGINE_PATH", os.path.join("bin", f"llama-server{EXT}"))

class AppState:
    def __init__(self):
        self.engine_process = None
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
        res = await state.health_client.get(f"http://{LLM_HOST}:{LLM_PORT}/health")
        return res.status_code == 200
    except Exception:
        return False

def boost_process_priority(pid):
    try:
        p = psutil.Process(pid)
        if os.name == "nt":
            p.nice(psutil.HIGH_PRIORITY_CLASS)
        else:
            try:
                p.nice(-10)
            except Exception:
                pass
    except Exception:
        pass

def set_cpu_affinity(pid):
    try:
        p = psutil.Process(pid)
        if hasattr(p, "cpu_affinity"):
            p.cpu_affinity(list(range(4)))
    except Exception:
        pass

def engine_logger():
    global state
    if not state.engine_process: return
    for line in iter(state.engine_process.stdout.readline, ""):
        clean_line = line.strip()
        if clean_line:
            state.logs.append(clean_line)
            if "llama_new_context_with_model: n_ctx" in clean_line:
                state.status = "Preparing Context..."
            elif "warming up the model" in clean_line:
                state.status = "Warming Up Model..."
            elif "HTTP server listening" in clean_line:
                state.status = "Engine Ready - Pre-warming KV Cache..."

async def prewarm_kv_cache():
    await asyncio.sleep(5)
    payload = {
        "messages": [
            {"role": "system", "content": DEFAULT_SYSTEM_PROMPT},
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
    except Exception:
        state.status = "Ready"

def start_engine():
    model_path = db_service.get_setting("active_model", os.getenv("MODEL_PATH", os.path.join("models", "Bonsai-8B-Q1_0.gguf")))
    if not os.path.exists(ENGINE_PATH):
        err = f"Error: Engine not found at {ENGINE_PATH}"
        state.logs.append(err)
        return

    cmd = [
        ENGINE_PATH, "-m", model_path, "--host", LLM_HOST, "--port", str(LLM_PORT),
        "-c", str(db_service.get_setting("context_size", CONTEXT_SIZE)), 
        "-t", str(THREADS), "-b", BATCH_SIZE, "-ub", UBATCH_SIZE, "--no-webui",
    ]

    if GPU_MODE:
        cmd += ["-ngl", GPU_LAYERS, "-fa", FLASH_ATTENTION, "--parallel", GPU_PARALLEL, "--mmap"]
    else:
        cmd += ["-ngl", "0", "-fa", FLASH_ATTENTION, "-ctk", KV_QUANT, "-ctv", KV_QUANT, "--mmap", "--no-warmup"]
        if NGRAM_SPEC:
            cmd += ["--spec-type", "ngram-simple", "--draft", NGRAM_DRAFT]

    state.engine_process = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1
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
    state.is_warmed_up = False
    state.status = "Stopped"

def get_engine_state():
    return {
        "status": state.status,
        "logs": list(state.logs),
        "is_ready": state.is_warmed_up,
        "pid": state.engine_process.pid if state.engine_process else None
    }

def get_models_list():
    models_dir = "models"
    models = []
    if os.path.exists(models_dir):
        for f in os.listdir(models_dir):
            if f.endswith(".gguf"):
                models.append(os.path.join(models_dir, f))
    return models

async def stream_llm_response(payload):
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", f"http://{LLM_HOST}:{LLM_PORT}/v1/chat/completions", json=payload) as r:
            if r.status_code != 200:
                yield f"data: {json.dumps({'error': f'Engine returned {r.status_code}'})}\n\n"
                return
            async for chunk in r.aiter_lines():
                if chunk:
                    yield chunk + "\n"

async def translate_text(text: str, source_lang: str, target_lang: str):
    prompt = (
        f"You are an expert multilingual translation assistant.\n"
        f"Translate the following text from '{source_lang}' to '{target_lang}'.\n"
        f"After translating, analyze the original text/context and suggest exactly 3 short, context-appropriate, helpful replies or follow-ups in '{target_lang}' (or the language of the original text if more appropriate for replying).\n\n"
        f"Format your response EXACTLY as a single valid JSON object containing the translation and the list of replies. "
        f"Do NOT include any markdown code blocks, backticks, or other text outside the JSON object.\n\n"
        f"JSON Schema:\n"
        f"{{\n"
        f"  \"translation\": \"translated text here\",\n"
        f"  \"replies\": [\n"
        f"    \"suggested reply 1\",\n"
        f"    \"suggested reply 2\",\n"
        f"    \"suggested reply 3\"\n"
        f"  ]\n"
        f"}}\n\n"
        f"Text to translate:\n"
        f"{text}"
    )
    
    payload = {
        "messages": [
            {"role": "system", "content": "You are a JSON translation assistant. Output only raw JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 1024
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(f"http://{LLM_HOST}:{LLM_PORT}/v1/chat/completions", json=payload)
        if res.status_code != 200:
            raise Exception(f"Engine returned status code {res.status_code}")
        data = res.json()
        content = data["choices"][0]["message"]["content"].strip()
        
        # Clean the output if the model wrapped it in markdown code blocks
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
            if content.endswith("```"):
                content = content.rsplit("\n", 1)[0]
                
        # Fallback cleaning if there's text before or after the JSON braces
        start_idx = content.find("{")
        end_idx = content.rfind("}")
        if start_idx != -1 and end_idx != -1:
            content = content[start_idx:end_idx+1]
            
        parsed = json.loads(content)
        return parsed

async def generate_coding_plan(feature_name: str, tech_stack: str, requirements: str, files_scope: str = ""):
    prompt = (
        f"Generate a highly detailed, professional, and practical Coding/Implementation Plan in Markdown format for the following feature:\n\n"
        f"Feature Name: {feature_name}\n"
        f"Technology Stack: {tech_stack}\n"
        f"Scope / Files to Modify (optional): {files_scope if files_scope else 'Not specified'}\n"
        f"Detailed Requirements / Description:\n{requirements}\n\n"
        f"Structure the markdown plan EXACTLY with the following sections:\n"
        f"# Goal Description\n"
        f"Brief description of the problem, any background context, and what the change accomplishes.\n\n"
        f"## Proposed Changes\n"
        f"Group files by component or layer and order them logically. Use [NEW], [MODIFY], or [DELETE] to demarcate file status, and list filenames as bullet points. Explain what needs to be changed in each file.\n\n"
        f"## Verification Plan\n"
        f"Detailed instructions on how to verify the changes.\n"
        f"### Automated Tests\n"
        f"Provide mock command lines or test files/test descriptions.\n"
        f"### Manual Verification\n"
        f"Step-by-step description of manual validation (e.g., UI checks, API responses).\n\n"
        f"## Potential Caveats & Design Considerations\n"
        f"Any breaking changes, performance concerns, security implications, or edge cases to consider.\n\n"
        f"Write the plan in Indonesian if the requirements/description is primarily in Indonesian, otherwise write it in English. Do not wrap the entire output in a single code block; return it as raw Markdown text."
    )
    
    payload = {
        "messages": [
            {
                "role": "system", 
                "content": "You are an expert software architect and senior systems developer. You write precise, technical, and detailed implementation plans in raw Markdown."
            },
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 4096
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        res = await client.post(f"http://{LLM_HOST}:{LLM_PORT}/v1/chat/completions", json=payload)
        if res.status_code != 200:
            raise Exception(f"Engine returned status code {res.status_code}")
        data = res.json()
        content = data["choices"][0]["message"]["content"].strip()
        return content

