# ROBIT

A lightweight, powerful local AI workspace designed for maximum privacy and performance.

---

## Key Features

- **Agentic Thinking Loop** — ROBIT can search the web and read files autonomously to solve complex tasks.
- **Universal Hardware Support** — Native optimization for NVIDIA (CUDA), AMD/Intel (Vulkan), and Mac (Metal).
- **Live HTML/CSS Preview** — Instant visual rendering of web designs directly in the chat interface.
- **High-Speed 1-Bit Inference** — PrismML kernels for maximum tokens/sec on standard CPUs.

---

## Supported Models

All models must be in **GGUF** format. You can import them directly from the ROBIT GUI interface.

### Recommended (High Performance)

| Model | Size | VRAM | Speed (RTX 3050) | Download |
| :--- | :--- | :--- | :--- | :--- |
| **Bonsai 8B Q1_0** | 1.15 GB | ~1.6 GB | **~42.5 t/s** | [Download](https://huggingface.co/prism-ml/Bonsai-8B-gguf/tree/main) |

### Verified Compatibility (Fits in 8GB VRAM)

| Model | Size | VRAM | Speed Est. | Download |
| :--- | :--- | :--- | :--- | :--- |
| **DeepSeek-R1 7B** | 4.1 GB | ~4.7 GB | ~18–22 t/s | [Bartowski/HF](https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-7B-GGUF) |
| **Llama 3.1 8B** | 4.9 GB | ~5.5 GB | ~15–20 t/s | [Bartowski/HF](https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF) |
| **Mistral 7B v0.3** | 4.1 GB | ~4.7 GB | ~18–22 t/s | [Bartowski/HF](https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3) |
| **Phi-3 Mini** | 2.2 GB | ~2.8 GB | ~25–30 t/s | [Microsoft/HF](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf) |
| **Qwen2.5-Coder-7B-Instruct-GGUF** | 3.02 GB | ~4.0 GB | ~25–30 t/s | [Qwen/HF](https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF) |

---

## Installation & Setup

ROBIT is now distributed as a **Portable Web Application**. You do not need to install Python or deal with OS corruption caused by native installers.

### Option 1: Portable Release (Recommended)
1. **Download the App:** Navigate to the [Releases](https://github.com/ridwanmubarok/robit/releases/latest) page and download the portable archive for your OS (`.zip` for Windows, `.tar.gz` for Mac/Linux).
2. **Extract & Launch:** Extract the folder, then run the `Start_ROBIT` script (`.bat` on Windows, `.command` on Mac, `.sh` on Linux).
3. **Plug & Play:** A local server will start in the background, and your default web browser will automatically open ROBIT at `http://127.0.0.1:8000`.

### Option 2: Run from Source (For Developers)
If you prefer to run ROBIT from the source code using Python:
1. Clone the repository and install requirements: `pip install -r requirements.txt`
2. **Run Server:** `python robit.py serve` (This builds the UI and starts the backend).
3. **Run Server (Skip Build):** `python robit.py serve --skip-build`
4. **Development Mode (Hot-Reload):** `python robit.py dev` (Starts FastAPI and the Astro frontend concurrently with HMR).

---

### First Run & Model Setup
On first launch, the app will guide you to:
1. Download the optimized AI engine for your hardware (Llama.cpp).
2. Import your downloaded `.gguf` model file.
3. Start chatting locally — no internet required for inference, and your data stays on your machine.

---

## Performance Benchmark (Bonsai 8B Q1_0)

| Mode | Tokens Per Second (Avg) |
| :--- | :--- |
| NVIDIA CUDA (RTX 3060) | **~40.0 t/s** |
| AMD Vulkan (RX 580) | **~18.5 t/s** |
| CPU Native (Ryzen 3) | **~2.0 t/s** |
| Apple Silicon (M1 Pro) | **~14.5 t/s** |

---

## Contributors

- **Ridwan Mubarok** ([@ridwanmubarok](https://github.com/ridwanmubarok)) — Lead Developer / Rogatekno Labs
- **Ramdlan Faqih** ([@RamdlanFaqih](https://github.com/RamdlanFaqih)) — Rogatekno Labs
- **Rogatekno AI Team** — Algorithm Optimization & UI/UX

---
© 2026 **Rogatekno Labs** — Developed by **Ridwan Mubarok**
