# ROBIT: Ultra-Fast 1-Bit Local LLM Runner

A lightweight local AI chat interface powered by **llama.cpp**, with support for CPU and GPU (Vulkan) backends. Run large language models entirely on your own machine — no cloud, no API keys, total privacy.

---

## Features

- **Live HTML/CSS Preview** — Instant visual rendering of web designs directly in the chat interface via Code/Preview tabs.
- **Improved Document Analysis** — Upload PDF, Code, or Text files to provide context. Attachments are now visible directly in the chat history.
- **Custom System Persona** — Define the assistant's behavior, tone, and technical focus via the Settings modal.
- **1-Click Startup** — Dedicated scripts for Windows (`.bat`) and Unix/Mac (`.sh`) for easy, non-technical execution.
- **GPU Acceleration** — High-performance AMD, NVIDIA, and Intel GPU support via the Vulkan backend.
- **Advanced CPU Optimization** — Native 1-bit kernels (PrismML) for maximum efficiency on standard processors.
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

## Getting Started

### 1. Download Local AI
Clone this repository and ensure you have the `bin/` or `bin-vulkan/` engines installed.

### 2. Install Model
Place your desired `.gguf` file in the `models/` directory. (e.g., `models/Bonsai-8B-Q1_0.gguf`).

### 3. One-Click Launch
No terminal commands required for daily use:
- **Windows:** Double-click `ROBIT_Run_Windows.bat`
- **Linux/Mac:** Run `ROBIT_Run_Unix.sh`

*These scripts automatically initialize your environment, check for Python/Dependencies, and launch the server.*

---

## Manual Configuration (.env)

If you need to change the hardware mode or model path manually:
```env
# Switch between GPU and CPU
USE_GPU=true          # true for NVIDIA/AMD/Intel GPU | false for CPU only

# Hardware settings
THREADS=4             # Match your physical CPU cores
GPU_LAYERS=99         # Offload all layers to GPU
```

---

## Verified Performance (RX 580 + Bonsai 8B Q1_0)

| Deployment Mode | Average Generation Speed |
| :--- | :--- |
| GPU Vulkan (AMD RX 580) | **~18.5 t/s** |
| CPU Native (Ryzen 3 3200G) | **~2.0 t/s** |

---
© 2026 **Rogatekno Labs** — Developed by **Ridwan Mubarok**
