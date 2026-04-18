# ROBIT: Ultra-Fast 1-Bit Research & Coding Agent

A lightweight, powerful local AI research suite powered by **llama.cpp**. ROBIT features a recursive agentic loop, allowing it to browse the internet, analyze local files (including PDFs), and write code with native 1-bit efficiency.

---

## Key Features

- **Agentic Thinking Loop** — ROBIT can search the web and read files autonomously to solve complex tasks.
- **Universal Hardware Support** — Native optimization for NVIDIA (CUDA), AMD/Intel (Vulkan), and Mac (Metal).
- **Live HTML/CSS Preview** — Instant visual rendering of web designs directly in the chat interface.
- **Auto PDF-to-Text** — Just provide the path to a PDF; ROBIT extracts the text automatically.
- **High-Speed 1-Bit Inference** — PrismML kernels for maximum tokens/sec on standard CPUs.

---

## Hardware Support & Backends

| Hardware | Recommended Backend | Setup Folder | Speed (Bonsai 8B) |
| :--- | :--- | :--- | :--- |
| **NVIDIA RTX / GTX** | **CUDA** | `bin-cuda/` | **~40+ t/s** |
| **AMD / Intel Arc** | **Vulkan** | `bin-vulkan/` | **~18.5 t/s** |
| **Apple M1/M2/M3** | **Metal** | `bin-metal/` | **NA** |
| **Old/Basic CPU** | **CPU (1-Bit)** | `bin/` | ~2-5 t/s |

---

## Supported Models

All models must be in **GGUF** format and placed in the `models/` directory.

### Recommended (High Performance)

| Model | Size | VRAM | Speed (RTX 3050) | Download |
| :--- | :--- | :--- | :--- | :--- |
| **Bonsai 8B Q1_0** | 1.15 GB | ~1.6 GB | **~42.5 t/s** | [Download]([https://huggingface.co/Rogatekno/Bonsai-8B-GGUF](https://huggingface.co/prism-ml/Bonsai-8B-gguf/tree/main)) |

### Verified Compatibility (Fits in 8GB VRAM)

| Model | Size | VRAM | Speed Est. | Download |
| :--- | :--- | :--- | :--- | :--- |
| **DeepSeek-R1 7B** | 4.1 GB | ~4.7 GB | ~18–22 t/s | [Bartowski/HF](https://huggingface.co/bartowski/DeepSeek-R1-Distill-Llama-7B-GGUF) |
| **Llama 3.1 8B** | 4.9 GB | ~5.5 GB | ~15–20 t/s | [Bartowski/HF](https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF) |
| **Mistral 7B v0.3** | 4.1 GB | ~4.7 GB | ~18–22 t/s | [Bartowski/HF](https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF) |
| **Phi-3 Mini** | 2.2 GB | ~2.8 GB | ~25–30 t/s | [Bartowski/HF](https://huggingface.co/bartowski/Phi-3-mini-4k-instruct-GGUF) |

---

## Detailed Installation & Setup

### 1. Environment Setup
Make sure you have **Python 3.12.6** installed. Then, clone the repository and install the required dependencies:
```bash
git clone https://github.com/Rogatekno/robit.git
cd robit
pip install -r requirements.txt
```

### 2. Prepare the AI Engine (llama-server)
ROBIT uses `llama-server` as the backbone engine. You must download the version that matches your hardware from the [llama.cpp Releases](https://github.com/ggml-org/llama.cpp/releases/latest):

- **NVIDIA Users (CUDA):** Download `win-cuda-x64.zip`, extract, and move the files to the `bin-cuda/` folder.
- **AMD/Intel Users (Vulkan):** Download `win-vulkan-x64.zip`, extract, and move the files to the `bin-vulkan/` folder.
- **Apple Silicon (Metal):** Download `macos-metal-arm64.zip`, extract, and move the files to the `bin-metal/` folder.
- **Standard CPU (AVX2):** Download `win-avx2-x64.zip`, extract, and move to the `bin/` folder.

### 3. Configuration (.env)
Copy `.env.example` to `.env` and adjust your settings:
- **`USE_GPU=true`**: Enable hardware acceleration.
- **`GPU_BACKEND`**: Set to `cuda`, `vulkan`, or `metal`.
- **`MODEL_PATH`**: Point to your `.gguf` file in the `models/` directory.

### 4. Launch ROBIT
- **Windows:** Simply double-click **`ROBIT_Run_Windows.bat`**.
- **Linux / macOS:** 
  ```bash
  chmod +x ROBIT_Run_Unix.sh
  ./ROBIT_Run_Unix.sh
  ```

---

## Performance Benchmark (Bonsai 8B Q1_0)

| Mode | Tokens Per Second (Avg) |
| :--- | :--- |
| NVIDIA CUDA (RTX 3060) | **~40.0 t/s** |
| AMD Vulkan (RX 580) | **~18.5 t/s** |
| CPU Native (Ryzen 3) | **~2.0 t/s** |

---

## Contributors

- **Ridwan Mubarok** ([@ridwanmubarok](https://github.com/ridwanmubarok)) — Lead Developer / Rogatekno Labs
- **Rogatekno AI Team** — Algorithm Optimization & UI/UX

---
© 2026 **Rogatekno Labs** — Developed by **Ridwan Mubarok**
