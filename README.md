# Rogatekno Labs: 1-Bit LLM Inference Research

A specialized research environment for evaluating **BitNet (1.58-bit)** architectures on consumer-grade hardware. This platform utilizes the **Bonsai-8B** model to demonstrate extreme efficiency by replacing floating-point multiplications with simple tensor additions.

**Lead Researcher:** Ridwan Mubarok ([amubhya](https://github.com/amubhya))  
**Model Source:** [prism-ml/Bonsai-8B-gguf](https://huggingface.co/prism-ml/Bonsai-8B-gguf)

---

## 🔬 Core Research: The 1-Bit Revolution

Traditional Large Language Models (LLMs) rely on high-precision numerical weights (16-bit or 8-bit), creating massive memory and compute bottlenecks. 

**1-Bit Native (1.58-bit)** quantization represents weights using only three values: **{-1, 0, 1}**. 
- **Compute:** Eliminates expensive multiplication, allowing CPUs to process 8B parameter models using simple, high-speed additions.
- **Memory:** Reduces the model footprint to just **1.15 GB**, enabling inference on devices with limited RAM.

## 📊 Experimental Results (Ryzen 3 + RX 580)

All benchmarks were conducted using `benchmark.py` (headless, no browser overhead):

| Research Category | Tokens | Duration | Speed (t/s) |
| :--- | :--- | :--- | :--- |
| **Basic Knowledge** | 74 | 4.00s | **18.49** |
| **Creative Writing** | 168 | 9.09s | **18.48** |

> [!IMPORTANT]
> **Research Milestone:** Enabling the AMD RX 580 via Vulkan backend achieved a **9x speedup** over the CPU-only baseline — from **~2.1 t/s** to **~18.5 t/s** on the same machine.

### Optimization Journey

| Mode | Backend | Speed (t/s) | Δ |
| :--- | :--- | :--- | :--- |
| CPU Baseline | PrismML 1-bit native | ~2.01 | — |
| CPU + TurboQuant | KV-Q4_0 + Flash Attention | ~2.16 | +7% |
| **GPU Vulkan** | **llama.cpp + AMD RX 580** | **~18.49** | **+819%** |

## 🚀 Key Optimizations

- **Vulkan GPU Offload:** All 32 transformer layers offloaded to AMD RX 580 (8GB VRAM) via Vulkan for maximum bandwidth utilization (~256 GB/s).
- **TurboQuant (CPU Mode):** KV Cache compression (Q4_0) + Flash Attention to maximize throughput on memory-constrained CPUs.
- **N-Gram Speculative Decoding:** CPU-mode speculation of 8 tokens per pass with zero draft model overhead.
- **Configurable via `.env`:** One-line mode switching between CPU and GPU backends.

## 📦 Quick Start

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Download Model (~1.15 GB)
Download [Bonsai-8B-Q1_0.gguf](https://huggingface.co/prism-ml/Bonsai-8B-gguf/resolve/main/Bonsai-8B-Q1_0.gguf?download=true) and place it in the `models/` directory.

### 3. Install Engine Binaries

> [!NOTE]
> Both `bin/` and `bin-vulkan/` are excluded from Git due to file size. You must download them manually.

**Option A — CPU Mode (PrismML 1-bit native):**
This engine uses specialized 1-bit kernels. Get it via the official Bonsai-demo setup:
```powershell
git clone https://github.com/PrismML-Eng/Bonsai-demo.git
cd Bonsai-demo
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup.ps1
```
Then copy the generated `bin/` folder into this project's root directory.

**Option B — GPU Mode (AMD / Vulkan):**
Download the official llama.cpp Vulkan build and extract to `bin-vulkan/`:
```
https://github.com/ggml-org/llama.cpp/releases/download/b8838/llama-b8838-bin-win-vulkan-x64.zip
```
Extract so that `llama-server.exe` is at `bin-vulkan/llama-server.exe`.

### 4. Configure Mode (`.env`)
```env
# CPU Mode (PrismML 1-bit native)
USE_GPU=false

# GPU Mode (AMD RX 580 / Vulkan) — 9x faster
USE_GPU=true
```

### 5. Run & Benchmark
```bash
python server.py       # Start the research server
python benchmark.py    # Verify performance
```

---
© 2026 **Rogatekno Labs**. Research by **Ridwan Mubarok / amubhya**.
