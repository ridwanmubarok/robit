import React, { useState, useEffect } from 'react';

export default function WhichLLMArea() {
    const [hwInfo, setHwInfo] = useState(null);
    const [dynamicInfo, setDynamicInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/setup/hardware").then(res => res.json()),
            fetch("/api/setup/whichllm-dynamic").then(res => res.json())
        ])
        .then(([hwData, dynamicData]) => {
            setHwInfo(hwData);
            if (dynamicData.success) {
                setDynamicInfo(dynamicData);
            }
            setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }, []);

    return (
        <section id="whichllm-view" className="flex-1 flex flex-col h-full bg-transparent p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="w-full space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
                        WhichLLM Advisor
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">Hardware Detection & Model Recommendations for your local machine.</p>
                  </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-20 flex flex-col items-center justify-center">
                        <svg className="animate-spin h-8 w-8 text-white mb-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span className="text-white font-bold uppercase tracking-wider text-xs mb-2">Analyzing HuggingFace Hub...</span>
                        <span className="text-neutral-500 text-[10px]">Fetching real-time top GGUF models & calculating hardware fit.</span>
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

                        {/* Dynamic Recommendations Box */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                                Live HuggingFace Recommendations
                            </h3>
                            <div className="space-y-3">
                                {dynamicInfo && dynamicInfo.recommendations && dynamicInfo.recommendations.map((rec, i) => (
                                    <div key={i} className="bg-[#0a0a0a]/40 border border-[#171717] rounded-2xl p-5 hover:bg-[#171717]/40 transition-colors flex flex-col gap-3">
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold text-neutral-400 flex items-center gap-2">
                                                    {rec.repo.split('/')[0]}
                                                    <span className="bg-[#1f2937] text-white px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">Top Repo</span>
                                                </div>
                                                <div className="text-base font-bold text-white mt-0.5">{rec.repo.split('/')[1]}</div>
                                                <div className="text-xs text-indigo-400 font-mono mt-1">{rec.filename}</div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <div className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold flex items-center gap-1.5 ${
                                                    rec.score === 100 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                    rec.score === 80 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        rec.score === 100 ? 'bg-emerald-400' :
                                                        rec.score === 80 ? 'bg-amber-400' :
                                                        'bg-rose-400'
                                                    }`}></span>
                                                    {rec.fit}
                                                </div>
                                                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                                        {rec.downloads.toLocaleString()}
                                                    </span>
                                                    <span>•</span>
                                                    <span>File: {rec.size_gb} GB</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-[#171717]/60 border border-[#262626] rounded-xl p-3 flex items-center gap-3 mt-1">
                                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700">
                                                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Est. Required RAM</div>
                                                <div className="text-sm font-black text-white">{rec.required_ram} <span className="text-[10px] text-neutral-400 font-semibold">GB (Incl. Context)</span></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!dynamicInfo || !dynamicInfo.recommendations || dynamicInfo.recommendations.length === 0) && (
                                    <div className="text-center py-10 text-neutral-500 text-sm">No recommendations found. Please ensure your internet connection is active.</div>
                                )}
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
