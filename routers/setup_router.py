from fastapi import APIRouter, Request
import platform
import psutil
import os
import sys
import json
import threading
import urllib.request
import time
import zipfile
import shutil
from pathlib import Path

router = APIRouter()

# All runtime data goes to ~/.robit/ — writable, persistent across app updates
ROBIT_DATA_DIR = os.path.join(str(Path.home()), ".robit")
os.makedirs(ROBIT_DATA_DIR, exist_ok=True)
APP_BASE_DIR = ROBIT_DATA_DIR

# Global state for download progress
download_state = {
    "engine": {
        "status": "idle", # idle, downloading, extracting, done, error
        "progress": 0.0,
        "total_mb": 0.0,
        "downloaded_mb": 0.0,
        "error": ""
    },
    "model": {
        "status": "idle", # idle, downloading, done, error
        "progress": 0.0,
        "total_mb": 0.0,
        "downloaded_mb": 0.0,
        "error": ""
    }
}

LLAMA_CPP_RELEASE = "b9590"

@router.get("/api/setup/hardware")
async def get_hardware_info():
    os_name = f"{platform.system()} {platform.machine()}"
    ram_gb = round(psutil.virtual_memory().total / (1024**3), 1)
    
    gpu_info = "Unknown GPU"
    recommended_engine = "CPU"
    
    if platform.system() == "Windows":
        recommended_engine = "Vulkan"
    elif platform.system() == "Darwin":
        recommended_engine = "Metal"
    elif platform.system() == "Linux":
        recommended_engine = "Vulkan"
        
    return {
        "success": True,
        "os": os_name,
        "ram": f"{ram_gb} GB",
        "gpu": gpu_info,
        "recommendedEngine": recommended_engine,
        "recommendedModel": "Qwen2.5-Coder-7B-Instruct-Q4_K_M.gguf"
    }


def save_gpu_config(engine_type: str):
    """Persist GPU mode config to ~/.robit/config.json so packaged app reads it."""
    robit_dir = os.path.join(str(Path.home()), ".robit")
    os.makedirs(robit_dir, exist_ok=True)
    config_path = os.path.join(robit_dir, "config.json")
    
    existing = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                existing = json.load(f)
        except Exception:
            pass
    
    if engine_type in ("Vulkan", "CUDA", "Metal"):
        existing["USE_GPU"] = "true"
        existing["GPU_BACKEND"] = engine_type.lower()
    else:
        existing["USE_GPU"] = "false"
    
    with open(config_path, "w") as f:
        json.dump(existing, f, indent=2)

def get_engine_download_url(engine_type: str):
    base_url = f"https://github.com/ggml-org/llama.cpp/releases/download/{LLAMA_CPP_RELEASE}"
    sys_name = platform.system()
    machine = platform.machine().lower()

    arch_str = "arm64" if machine in ["arm64", "aarch64"] else "x64"

    if sys_name == "Linux":
        if engine_type == "Vulkan":
            return f"{base_url}/llama-{LLAMA_CPP_RELEASE}-bin-ubuntu-vulkan-{arch_str}.tar.gz"
        elif engine_type == "CUDA":
            return f"{base_url}/llama-{LLAMA_CPP_RELEASE}-bin-ubuntu-cuda-cu12.4-{arch_str}.tar.gz"
        else:
            return f"{base_url}/llama-{LLAMA_CPP_RELEASE}-bin-ubuntu-{arch_str}.tar.gz"
            
    elif sys_name == "Windows":
        if engine_type == "Vulkan":
            return f"{base_url}/llama-{LLAMA_CPP_RELEASE}-bin-win-vulkan-{arch_str}.zip"
        elif engine_type == "CUDA":
            return f"{base_url}/llama-{LLAMA_CPP_RELEASE}-bin-win-cuda-cu12.4-{arch_str}.zip"
        else:
            return f"{base_url}/llama-{LLAMA_CPP_RELEASE}-bin-win-{arch_str}.zip"
            
    elif sys_name == "Darwin":
        # macOS uses Metal natively
        return f"{base_url}/llama-{LLAMA_CPP_RELEASE}-bin-macos-{arch_str}.zip"
        
    return f"{base_url}/llama-{LLAMA_CPP_RELEASE}-bin-ubuntu-{arch_str}.tar.gz"

def get_engine_dest_dir(engine_type: str):
    if engine_type == "Vulkan":
        return "bin-vulkan"
    elif engine_type == "CUDA":
        return "bin-cuda"
    elif engine_type == "Metal":
        return "bin-metal"
    else:
        return "bin"

def download_engine_thread(engine_type: str):
    global download_state
    url = get_engine_download_url(engine_type)
    dest_dir = os.path.join(os.getcwd(), get_engine_dest_dir(engine_type))
    os.makedirs(dest_dir, exist_ok=True)
    
    is_tar = url.endswith(".tar.gz")
    archive_name = "llama_cpp.tar.gz" if is_tar else "llama_cpp.zip"
    archive_path = os.path.join(dest_dir, archive_name)
    
    download_state["engine"]["status"] = "downloading"
    download_state["engine"]["progress"] = 0.0
    download_state["engine"]["error"] = ""
    
    try:
        def reporthook(count, block_size, total_size):
            if total_size > 0:
                downloaded = count * block_size
                download_state["engine"]["progress"] = min(100.0, (downloaded / total_size) * 100)
                download_state["engine"]["downloaded_mb"] = round(downloaded / (1024 * 1024), 2)
                download_state["engine"]["total_mb"] = round(total_size / (1024 * 1024), 2)

        urllib.request.urlretrieve(url, archive_path, reporthook)
        
        download_state["engine"]["status"] = "extracting"
        
        temp_ext_dir = os.path.join(dest_dir, "temp_ext")
        os.makedirs(temp_ext_dir, exist_ok=True)
        
        if is_tar:
            import tarfile
            with tarfile.open(archive_path, 'r:gz') as tar_ref:
                tar_ref.extractall(temp_ext_dir)
        else:
            with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                zip_ref.extractall(temp_ext_dir)
            
        # Find the actual llama-server binary and move it directly to dest_dir
        for root, dirs, files in os.walk(temp_ext_dir):
            for file in files:
                shutil.move(os.path.join(root, file), os.path.join(dest_dir, file))
                
        shutil.rmtree(temp_ext_dir)
        os.remove(archive_path)
        
        # Ensure executable permissions on linux/mac
        ext = ".exe" if os.name == "nt" else ""
        bin_path = os.path.join(dest_dir, f"llama-server{ext}")
        if os.path.exists(bin_path) and os.name != "nt":
            os.chmod(bin_path, 0o755)
            
        download_state["engine"]["status"] = "done"
        download_state["engine"]["progress"] = 100.0
    except Exception as e:
        download_state["engine"]["status"] = "error"
        download_state["engine"]["error"] = str(e)

@router.post("/api/setup/download-engine")
async def start_engine_download(request: Request):
    body = await request.json()
    engine_type = body.get("engine_type", "Vulkan")
    
    dest_dir = os.path.join(APP_BASE_DIR, get_engine_dest_dir(engine_type))
    ext = ".exe" if os.name == "nt" else ""
    bin_path = os.path.join(dest_dir, f"llama-server{ext}")
    
    # Save GPU config so next launch uses GPU mode
    save_gpu_config(engine_type)
    
    if os.path.exists(bin_path):
        download_state["engine"]["status"] = "done"
        download_state["engine"]["progress"] = 100.0
        return {"success": True, "message": "Engine already exists"}
        
    thread = threading.Thread(target=download_engine_thread, args=(engine_type,))
    thread.daemon = True
    thread.start()
    
    return {"success": True, "message": "Engine download started"}


def import_model_thread(source_path: str, dest_path: str, model_name: str):
    global download_state
    download_state["model"]["status"] = "downloading"
    download_state["model"]["progress"] = 0.0
    download_state["model"]["error"] = ""
    
    try:
        total_size = os.path.getsize(source_path)
        download_state["model"]["total_mb"] = round(total_size / (1024 * 1024), 2)
        
        chunk_size = 4 * 1024 * 1024  # 4 MB per chunk
        copied = 0
        with open(source_path, 'rb') as src, open(dest_path, 'wb') as dst:
            while True:
                chunk = src.read(chunk_size)
                if not chunk:
                    break
                dst.write(chunk)
                copied += len(chunk)
                download_state["model"]["downloaded_mb"] = round(copied / (1024 * 1024), 2)
                if total_size > 0:
                    download_state["model"]["progress"] = min(100.0, (copied / total_size) * 100)
        
        from services import db_service
        db_service.set_setting("active_model", os.path.join("models", model_name))
        download_state["model"]["status"] = "done"
        download_state["model"]["progress"] = 100.0
    except Exception as e:
        download_state["model"]["status"] = "error"
        download_state["model"]["error"] = str(e)
        # cleanup partial file
        if os.path.exists(dest_path):
            os.remove(dest_path)

@router.post("/api/setup/import-model")
async def start_model_import(request: Request):
    body = await request.json()
    source_path = body.get("source_path")
    
    if not source_path or not os.path.exists(source_path):
        return {"success": False, "message": "Valid source_path is required"}
    
    model_name = os.path.basename(source_path)
    models_dir = os.path.join(APP_BASE_DIR, "models")
    os.makedirs(models_dir, exist_ok=True)
    dest_path = os.path.join(models_dir, model_name)
    
    if os.path.exists(dest_path):
        from services import db_service
        db_service.set_setting("active_model", os.path.join("models", model_name))
        download_state["model"]["status"] = "done"
        download_state["model"]["progress"] = 100.0
        return {"success": True, "message": "Model already exists"}
        
    thread = threading.Thread(target=import_model_thread, args=(source_path, dest_path, model_name))
    thread.daemon = True
    thread.start()
    
    return {"success": True, "message": "Model import started"}

@router.get("/api/setup/download-status")
async def get_download_status():
    return download_state

@router.get("/api/setup/status")
async def get_setup_status():
    from services import db_service
    active_model = db_service.get_setting("active_model", "")
    is_setup = False
    if active_model:
        # Check both relative-to-APP_BASE_DIR and absolute path
        full_path = active_model if os.path.isabs(active_model) else os.path.join(APP_BASE_DIR, active_model)
        if os.path.exists(full_path):
            is_setup = True
    return {"is_setup": is_setup}
