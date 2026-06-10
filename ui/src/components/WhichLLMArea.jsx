import React, { useState, useEffect } from 'react';

export default function WhichLLMArea() {
    const [hwInfo, setHwInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch("/api/hardware")
            .then(res => res.json())
            .then(data => {
                setHwInfo(data);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, []);

    const getRecommendations = (freeRam, totalRam) => {
        const recs = [];
        if (freeRam >= 14 || totalRam >= 32) {
            recs.push({ model: "32B Models (Q4_K_M)", memory: "~20GB", note: "Best for complex reasoning, but requires huge RAM/VRAM." });
        }
        if (freeRam >= 9 || totalRam >= 16) {
            recs.push({ model: "14B Models (Q4_K_M) - e.g. Qwen2.5-Coder-14B", memory: "~9.5GB", note: "Excellent balance of speed and deep coding knowledge." });
        }
        if (freeRam >= 5 || totalRam >= 8) {
            recs.push({ model: "7B/8B Models (Q4_K_M or Q5_K_M) - e.g. Qwen2.5-Coder-7B", memory: "~5.5GB", note: "The sweet spot for local hardware. Extremely fast and highly capable." });
        }
        recs.push({ model: "1B/3B Models (Q8_0) - e.g. Qwen2.5-Coder-3B", memory: "~2.5GB", note: "Lightning fast, runs on almost anything. Good for autocomplete." });
        
        return recs;
    };

    return (
        <section id="whichllm-view" className="flex-1 flex flex-col h-full bg-transparent p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl w-full mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2 tracking-tight flex items-center gap-2">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
                        WhichLLM Advisor
                    </h1>
                    <p className="text-neutral-400 text-sm">Hardware Detection & Model Recommendations for your local machine.</p>
                </div>

                {isLoading ? (
                    <div className="text-center py-20 flex flex-col items-center justify-center">
                        <svg className="animate-spin h-8 w-8 text-white mb-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span className="text-white font-bold uppercase tracking-wider text-xs">Detecting Hardware...</span>
                    </div>
                ) : hwInfo ? (
                    <div className="space-y-8">
                        {/* Hardware Specs Box */}
                        <div className="bg-[#0a0a0a] border border-[#171717] p-8 rounded-3xl relative overflow-hidden group">
                            <div className="absolute -right-10 -top-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-6 relative z-10">Your System Specifications</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                <div className="bg-[#0a0a0a]/60 rounded-2xl p-5 border border-[#171717]">
                                    <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total System RAM</div>
                                    <div className="text-3xl font-black text-white">{hwInfo.ram_gb} <span className="text-lg text-neutral-500 font-medium">GB</span></div>
                                </div>
                                <div className="bg-[#0a0a0a]/60 rounded-2xl p-5 border border-[#171717]">
                                    <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-1">Available Free RAM</div>
                                    <div className="text-3xl font-black text-white">{hwInfo.free_ram_gb} <span className="text-lg text-white/50 font-medium">GB</span></div>
                                </div>
                                <div className="bg-[#0a0a0a]/60 rounded-2xl p-5 border border-[#171717]">
                                    <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-1">Detected GPU</div>
                                    <div className="text-xl font-bold text-white mt-1 leading-tight">{hwInfo.gpu_name}</div>
                                </div>
                            </div>
                        </div>

                        {/* Recommendations Box */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Recommended GGUF Models</h3>
                            <div className="space-y-3">
                                {getRecommendations(hwInfo.free_ram_gb, hwInfo.ram_gb).map((rec, i) => (
                                    <div key={i} className="bg-[#0a0a0a]/40 border border-[#171717] rounded-2xl p-5 hover:bg-[#171717]/40 transition-colors">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                            <div className="text-base font-bold text-neutral-200">{rec.model}</div>
                                            <div className="bg-white/10 border border-white/20 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full w-fit">Requires {rec.memory}</div>
                                        </div>
                                        <p className="text-xs text-neutral-400">{rec.note}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="bg-neutral-900 border border-neutral-700 p-5 rounded-xl text-xs text-neutral-300">
                            <strong>Note:</strong> Llama.cpp (the engine powering ROBIT) will automatically split the model between your System RAM and your GPU VRAM (using Vulkan/CUDA). Even if your GPU VRAM is small, you can still run larger models as long as your System RAM can handle the rest.
                        </div>
                    </div>
                ) : (
                    <div className="text-rose-400 bg-rose-500/10 p-4 rounded-xl border border-rose-500/30 text-center font-semibold">Failed to load hardware information.</div>
                )}
            </div>
        </section>
    );
}
