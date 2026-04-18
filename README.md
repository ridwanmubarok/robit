# Rogatekno Labs - Extreme 1-Bit AI Research

A high-performance local AI research platform powered by **Bonsai 8B 1-Bit Native** architecture and **TurboQuant** optimizations, designed for extreme efficiency on standard consumer hardware (CPU-only).

**Lead Researcher:** Ridwan Mubarok ([amubhya](https://github.com/amubhya))

---

## 🔬 Scientific Overview

This project serves as a research environment for evaluating sub-byte quantization in Large Language Models (LLMs). We focus on the **Bonsai-8B** model, which utilizes a specialized 1.58-bit (ternary) weight representation to achieve near-instant inference on hardware traditionally incapable of running 8 billion parameter models.

### Model Reference
- **Model Name:** Bonsai-8B
- **Hugging Face Repository:** [prism-ml/Bonsai-8B-gguf](https://huggingface.co/prism-ml/Bonsai-8B-gguf)
- **Quantization:** Q1_0 (1-bit native weights)
- **Size:** ~1.15 GB

## 🔬 Research Statistics & Hardware Target

This research platform is tuned for consumer-grade silicon. Below is the verified performance baseline for this implementation:

- **Target CPU:** AMD Ryzen 3 3200G (4 Physical Cores @ 3.6GHz)
- **RAM:** 16GB Dual-Channel
- **Operating System:** Windows 10/11
- **Inference Speed:** **~2.01 tokens/second** (Verified Baseline)
- **Latency:** ~43s for standard explanatory responses.

### 📊 Verified Benchmark Output
```text
[BENCHMARK] Testing prompt: 'Explain the importance of 1-bit quantization in 3 short sentences.'
--------------------------------------------------
RESULTS:
  - Total Tokens: 63
  - Total Time:   43.83s
  - Gen. Speed:   2.01 tokens/second
  - Hardware:      AMD Ryzen 3 3200G (4 CPUs)
--------------------------------------------------
```

### Why CPU for 1-Bit Native?
While the system includes an AMD RX 580 GPU, the **Bonsai 8B Q1_0** architecture utilizes specialized bitwise kernels that are currently more optimized for CPU SIMD instructions (AVX2). CPU inference provides higher stability and better utilization of 1-bit native logic compared to legacy non-CUDA GPU drivers on this specific build.

## 🚀 Key Research Features

- **TurboQuant Optimization:** Implementation of extreme KV Cache compression and Flash Attention to resolve memory bandwidth bottlenecks during CPU-only inference.
- **Unified Research Environment:** A robust FastAPI backend managing the PrismML inference engine lifecycle and real-time streaming proxy.
- **Premium Performance Analytics:** Built-in technical metrics (Response Time, Token Count, and Speed in t/s) for accurate optimization benchmarking.
- **Advanced Semantic Rendering:** High-fidelity Markdown/Latex/Code rendering with interactive utilities like one-click code duplication.

## 🛠 Project Architecture

```text
Rogatekno/lm/
├── bin/            # PrismML specialized binaries
├── models/         # GGUF model storage (Bonsai-8B-Q1_0.gguf)
├── static/         # Frontend Research UI (HTML, CSS, JS)
├── server.py       # Unified Backend Wrapper & Metrics Logic
├── requirements.txt
└── README.md
```

## 📦 Getting Started

1. **Prerequisites:**
   - Python 3.10+
   - Windows 10/11 (CPU with AVX2/AVX512 support)

2. **Installation:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Inference Execution:**
   Start the research environment by running:
   ```bash
   python server.py
   ```
   Open your browser and navigate to **`http://localhost:8000`**.

## 🧠 Core Technology: The 1-Bit Revolution

This platform demonstrates the feasibility of running massive models on low-end specifications through:

1. **BitNet Architecture:** Shifting from traditional 16-bit floats to ternary {-1, 0, 1} weights, reducing VRAM/RAM consumption by >90%.
2. **Multiplication-Free Math:** Replacing expensive floating-point multiplications with simple additions, which are significantly faster on standard CPUs.
3. **KV-Cache Quantization:** Compressing the attention context to minimize data transfer across the memory bus.

---
© 2026 **Rogatekno Labs**. Built and Maintained by **Ridwan Mubarok / amubhya**.
