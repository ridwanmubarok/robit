# ⚡ ROBIT: Ultra-Fast 1-Bit Local LLM Runner

A lightweight local AI chat interface powered by **llama.cpp**, with support for CPU and GPU (Vulkan) backends. 

---

## ✨ Features

- 🖥️ **Web UI** — Clean chat interface accessible from your browser
- ⚡ **GPU Acceleration** — AMD, NVIDIA, and Intel GPU support via Vulkan
- 🧠 **CPU Fallback** — Runs on any x86 machine with AVX2 support
- 🔧 **Easy Config** — Switch GPU/CPU mode and tweak parameters via `.env`
- 📋 **Markdown Rendering** — Code highlighting, copy buttons, and formatted output
- 📊 **Performance Metrics** — Real-time tokens/second display per response

---

## 🖥️ Supported Hardware

| Hardware | Mode | Backend | Compatibility |
| :--- | :--- | :--- | :--- |
| **NVIDIA RTX / GTX** | GPU | Vulkan | ✅ Native Support |
| **AMD Radeon (RX / Vega)** | GPU | Vulkan | ✅ Native Support |
| **Intel Arc / UHD** | GPU | Vulkan | ✅ Native Support |
| **Any x86 CPU** | CPU | PrismML/AVX2 | ✅ Native Support |

---

## 📦 Supported Models

All models must be in **GGUF format** and placed in the `models/` directory.

### ⭐ Recommended (Default)

| Model | Size | VRAM | Speed (RX 580) | Link |
| :--- | :--- | :--- | :--- | :--- |
| **Bonsai 8B Q1_0** | 1.15 GB | ~1.6 GB | **~18.5 t/s** | [Download](https://huggingface.co/prism-ml/Bonsai-8B-gguf/resolve/main/Bonsai-8B-Q1_0.gguf?download=true) |

### 🟢 Works Great (Fits in 8GB VRAM)

| Model | Size | VRAM | Speed Est. | HuggingFace |
| :--- | :--- | :--- | :--- | :--- |
| Llama 3.1 8B Q4_K_M | 4.9 GB | ~5.5 GB | ~8–12 t/s | [meta-llama/Meta-Llama-3.1-8B-Instruct-GGUF](https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF) |
| Mistral 7B Q4_K_M | 4.1 GB | ~4.7 GB | ~10–14 t/s | [mistralai/Mistral-7B-Instruct-GGUF](https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF) |
| DeepSeek-R1 Distill 7B Q4 | 4.1 GB | ~4.7 GB | ~10–14 t/s | [DeepSeek-R1-Distill-Qwen-7B-GGUF](https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-7B-GGUF) |
| Qwen 2.5 7B Q4_K_M | 4.4 GB | ~5.0 GB | ~9–13 t/s | [Qwen2.5-7B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF) |
| Phi-3 Mini 3.8B Q4_K_M | 2.2 GB | ~2.8 GB | ~15–20 t/s | [Phi-3-mini-4k-instruct-GGUF](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf) |

### 🟡 CPU Only / Low VRAM

| Model | Size | Mode | Speed Est. |
| :--- | :--- | :--- | :--- |
| Bonsai 8B Q1_0 | 1.15 GB | CPU (1-bit native) | ~2 t/s |
| Phi-3 Mini Q4_K_M | 2.2 GB | CPU | ~1–2 t/s |

### 🔴 Not Recommended (Too Large for 8GB VRAM)

Models above ~7.5 GB will spill to system RAM, causing a significant speed drop (~1–3 t/s):
DeepSeek-R1 14B+, Llama 3 70B, Qwen 72B, etc.

---

## 🚀 Quick Start

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Download a Model
Place the `.gguf` file in the `models/` directory and update `MODEL_PATH` in `.env`.

### 3. Install Engine Binaries

> [!NOTE]
> `bin/` and `bin-vulkan/` are excluded from Git. Download them manually.

**CPU Mode (PrismML — best for Bonsai 1-bit):**
```powershell
git clone https://github.com/PrismML-Eng/Bonsai-demo.git
cd Bonsai-demo
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup.ps1
```
Copy the generated `bin/` folder to this project's root.

**GPU Mode (Vulkan — AMD / Intel / NVIDIA):**
Download and extract to `bin-vulkan/`:
```
https://github.com/ggml-org/llama.cpp/releases/download/b8838/llama-b8838-bin-win-vulkan-x64.zip
```

### 4. Configure `.env`
```env
# Switch between GPU and CPU
USE_GPU=true          # NVIDIA, AMD, or Intel GPU
USE_GPU=false         # CPU only (PrismML 1-bit)

# Point to your model file
MODEL_PATH=models/Bonsai-8B-Q1_0.gguf
```

### 5. Run
```bash
python server.py
```
Open your browser at **http://localhost:8000**

---

## 📊 Verified Performance (RX 580 + Bonsai 8B Q1_0)

| Mode | Speed |
| :--- | :--- |
| GPU Vulkan (AMD RX 580) | **~18.5 t/s** |
| CPU only (Ryzen 3 3200G) | ~2.0 t/s |

---
© 2026 **Rogatekno Labs** — Built by **Ridwan Mubarok**
