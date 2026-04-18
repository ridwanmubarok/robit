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

## 📊 Experimental Results (Ryzen 3 Baseline)

Benchmarks conducted on an **AMD Ryzen 3 3200G** (4 Cores @ 3.6GHz) with **TurboQuant** enabled:

| Research Category | Tokens | Duration | Speed (t/s) |
| :--- | :--- | :--- | :--- |
| **Basic Knowledge** | 76 | 35.24s | **2.16** |
| **Creative Writing** | 298 | 160.52s | **1.86** |
| **Code Synthesis** | 450+ | *Varies* | **~1.75** |
| **Logical Reasoning** | *N/A* | *Verified* | **~1.80** |

## 🚀 Key Optimizations

- **TurboQuant:** Extreme KV Cache compression (Q4_0) to resolve memory bandwidth bottlenecks.
- **1-Bit Native Kernels:** Specialized bitwise inference engine (PrismML) for optimized CPU SIMD execution.
- **Unified Backend:** FastAPI streaming proxy with integrated performance tracking.

## 📦 Quick Start

1. Install dependencies: `pip install -r requirements.txt`
2. Run research server: `python server.py`
3. Verify performance: `python benchmark.py`

---
© 2026 **Rogatekno Labs**.
