# ROBIT: Ultra-Fast 1-Bit Local LLM Runner

A lightweight local AI chat interface powered by **llama.cpp**, with support for CPU and GPU (Vulkan) backends. Run large language models entirely on your own machine — no cloud, no API keys, total privacy.

---

## Features

- **Document Context Reader** — Upload PDF, Code, or Text files to provide immediate context for the assistant.
- **Custom System Persona** — Define the assistant's behavior and tone via the dedicated Settings modal.
- **GPU Acceleration** — High-performance AMD, NVIDIA, and Intel GPU support via the Vulkan backend.
- **Advanced CPU Optimization** — Native 1-bit kernels (PrismML) for maximum efficiency on standard processors.
- **Clean Web Interface** — Modern, responsive chat UI featuring frosted-glass aesthetics and syntax highlighting.
- **Performance Monitoring** — Real-time tokens/second metrics and engine log visualization.

---

## Supported Hardware

| Hardware | Mode | Backend | Compatibility |
| :--- | :--- | :--- | :--- |
| **NVIDIA RTX / GTX** | GPU | Vulkan | Native Support |
| **AMD Radeon (RX / Vega)** | GPU | Vulkan | Native Support |
| **Intel Arc / UHD** | GPU | Vulkan | Native Support |
| **Any x86 CPU** | CPU | PrismML/AVX2 | Native Support |

---

## Supported Models

All models must be in GGUF format and placed in the `models/` directory.

### Recommended (High Performance)

| Model | Size | VRAM | Speed (RX 580) |
| :--- | :--- | :--- | :--- |
| **Bonsai 8B Q1_0** | 1.15 GB | ~1.6 GB | **~18.5 t/s** |

### Fully Supported (Fits in 8GB VRAM)

| Model | Size | VRAM | Speed Est. |
| :--- | :--- | :--- | :--- |
| DeepSeek-R1 Distill 7B | 4.1 GB | ~4.7 GB | ~10–14 t/s |
| Llama 3.1 8B Q4_K_M | 4.9 GB | ~5.5 GB | ~8–12 t/s |
| Mistral 7B Q4_K_M | 4.1 GB | ~4.7 GB | ~10–14 t/s |
| Qwen 2.5 7B Q4_K_M | 4.4 GB | ~5.0 GB | ~9–13 t/s |
| Phi-3 Mini 3.8B Q4_K_M | 2.2 GB | ~2.8 GB | ~15–20 t/s |

---

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Download Model
Place the desired `.gguf` file in the `models/` directory and update the `MODEL_PATH` in your `.env` file.

### 3. Install Engine Binaries

> [!NOTE]
> The `bin/` and `bin-vulkan/` directories are excluded from the repository. You must install the binaries manually.

**CPU Mode (PrismML):**
Best for 1-bit models like Bonsai.
```powershell
git clone https://github.com/PrismML-Eng/Bonsai-demo.git
cd Bonsai-demo
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup.ps1
```
Copy the generated `bin/` folder to the project root.

**GPU Mode (Vulkan):**
Download the Vulkan binaries and extract them to `bin-vulkan/`:
[llama-b8838-bin-win-vulkan-x64.zip](https://github.com/ggml-org/llama.cpp/releases/download/b8838/llama-b8838-bin-win-vulkan-x64.zip)

### 4. Configure .env
```env
# Switch between GPU and CPU
USE_GPU=true          # Set to true for NVIDIA/AMD/Intel GPU
USE_GPU=false         # Set to false for CPU only (PrismML)

# Model configuration
MODEL_PATH=models/Bonsai-8B-Q1_0.gguf
```

### 5. Start the Server
```bash
python server.py
```
Access the interface at: **http://localhost:8000**

---

## Verified Performance (RX 580 + Bonsai 8B Q1_0)

| Deployment Mode | Average Generation Speed |
| :--- | :--- |
| GPU Vulkan (AMD RX 580) | **~18.5 t/s** |
| CPU Native (Ryzen 3 3200G) | **~2.0 t/s** |

---
© 2026 **Rogatekno Labs** — Developed by **Ridwan Mubarok**
