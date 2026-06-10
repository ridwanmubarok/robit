import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings, useSaveSettings } from '../hooks/useQueries';

const settingsSchema = z.object({
    system_prompt: z.string().min(1, "System prompt cannot be empty"),
    context_size: z.number().min(512),
    temperature: z.number().min(0).max(1),
    top_p: z.number().min(0).max(1)
});

function Toggle({ checked, onChange }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-white' : 'bg-neutral-700'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${checked ? 'translate-x-6 bg-black' : 'translate-x-1 bg-neutral-400'}`} />
        </button>
    );
}

export default function SettingsArea() {
    const { data: initialSettings, isLoading } = useSettings();
    const saveSettingsMutation = useSaveSettings();
    const [status, setStatus] = useState("");

    // Engine / Hardware state
    const [engineCfg, setEngineCfg] = useState(null);
    const [engineStatus, setEngineStatus] = useState("");
    const [engineSaving, setEngineSaving] = useState(false);

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            system_prompt: "",
            context_size: 4096,
            temperature: 0.3,
            top_p: 0.9
        }
    });

    useEffect(() => {
        if (initialSettings) reset(initialSettings);
    }, [initialSettings, reset]);

    // Load engine config
    useEffect(() => {
        fetch('/api/settings/engine')
            .then(r => r.json())
            .then(data => setEngineCfg(data))
            .catch(() => {});
    }, []);

    const temperature = watch("temperature");
    const top_p = watch("top_p");

    const onSubmit = (data) => {
        setStatus("Saving...");
        saveSettingsMutation.mutate(data, {
            onSuccess: () => { setStatus("✅ Saved!"); setTimeout(() => setStatus(""), 3000); },
            onError: () => { setStatus("❌ Error saving"); setTimeout(() => setStatus(""), 3000); }
        });
    };

    const saveEngineConfig = () => {
        setEngineSaving(true);
        setEngineStatus("Applying & restarting engine...");
        fetch('/api/settings/engine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(engineCfg)
        })
        .then(r => r.json())
        .then(d => {
            setEngineStatus(d.success ? "✅ Engine config saved & restarted!" : "❌ Failed to save");
            setTimeout(() => setEngineStatus(""), 4000);
        })
        .catch(() => setEngineStatus("❌ Network error"))
        .finally(() => setEngineSaving(false));
    };

    const setEng = (key, val) => setEngineCfg(prev => ({ ...prev, [key]: val }));

    if (isLoading) return <div className="text-white p-8">Loading settings...</div>;

    return (
        <section id="settings-view" className="flex-1 flex flex-col h-full bg-transparent p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl w-full mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2 tracking-tight flex items-center gap-2">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        Advanced Settings
                    </h1>
                    <p className="text-neutral-400 text-sm">Fine-tune engine performance, GPU mode, and generation parameters.</p>
                </div>

                {/* ── ENGINE & HARDWARE ────────────────────────────────────── */}
                {engineCfg && (
                    <div className="mb-6 bg-[#0a0a0a]/40 border border-[#171717] p-6 rounded-2xl space-y-5">
                        <div className="flex items-center justify-between mb-1">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Engine &amp; Hardware</h3>
                                <p className="text-[11px] text-neutral-500 mt-0.5">Saved to <code className="text-neutral-400">~/.robit/config.json</code>. Engine restarts on save.</p>
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-yellow-500/70 bg-yellow-500/10 px-2 py-1 rounded-md">Requires restart</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* GPU Toggle */}
                            <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-white">GPU Acceleration</p>
                                    <p className="text-[11px] text-neutral-500 mt-0.5">Use GPU instead of CPU for inference</p>
                                </div>
                                <Toggle checked={engineCfg.use_gpu} onChange={v => setEng('use_gpu', v)} />
                            </div>

                            {/* GPU Backend */}
                            <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                                <p className="text-sm font-semibold text-white mb-2">GPU Backend</p>
                                <select
                                    value={engineCfg.gpu_backend}
                                    onChange={e => setEng('gpu_backend', e.target.value)}
                                    disabled={!engineCfg.use_gpu}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500 disabled:opacity-40 cursor-pointer"
                                >
                                    <option value="vulkan">Vulkan (AMD / Intel / Universal)</option>
                                    <option value="cuda">CUDA (NVIDIA RTX/GTX)</option>
                                    <option value="metal">Metal (Apple M1/M2/M3)</option>
                                </select>
                            </div>

                            {/* GPU Layers */}
                            <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-neutral-400 font-semibold">GPU Layers (ngl)</span>
                                    <span className="text-white font-mono">{engineCfg.gpu_layers}</span>
                                </div>
                                <input
                                    type="range" min="0" max="100" step="1"
                                    value={engineCfg.gpu_layers}
                                    onChange={e => setEng('gpu_layers', parseInt(e.target.value))}
                                    disabled={!engineCfg.use_gpu}
                                    className="w-full accent-white disabled:opacity-40"
                                />
                                <p className="text-[10px] text-neutral-500 mt-1">99 = offload all layers to GPU. Lower = share with CPU RAM.</p>
                            </div>

                            {/* Threads */}
                            <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-neutral-400 font-semibold">CPU Threads</span>
                                    <span className="text-white font-mono">{engineCfg.threads}</span>
                                </div>
                                <input
                                    type="range" min="1" max="32" step="1"
                                    value={engineCfg.threads}
                                    onChange={e => setEng('threads', parseInt(e.target.value))}
                                    className="w-full accent-white"
                                />
                                <p className="text-[10px] text-neutral-500 mt-1">Match your physical CPU cores for best performance.</p>
                            </div>

                            {/* Batch Size */}
                            <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                                <p className="text-sm font-semibold text-white mb-2">Batch Size</p>
                                <select
                                    value={engineCfg.batch_size}
                                    onChange={e => setEng('batch_size', parseInt(e.target.value))}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500 cursor-pointer"
                                >
                                    <option value={512}>512 — Low VRAM</option>
                                    <option value={1024}>1024 — Default</option>
                                    <option value={2048}>2048 — High Performance</option>
                                    <option value={4096}>4096 — Max (needs lots of VRAM)</option>
                                </select>
                            </div>

                            {/* Flash Attention & Ngram Spec */}
                            <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-white">Flash Attention</p>
                                        <p className="text-[11px] text-neutral-500">Faster attention (requires compatible GPU)</p>
                                    </div>
                                    <Toggle checked={engineCfg.flash_attention} onChange={v => setEng('flash_attention', v)} />
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                                    <div>
                                        <p className="text-sm font-semibold text-white">Ngram Speculative Decode</p>
                                        <p className="text-[11px] text-neutral-500">CPU-mode speed boost (~30% faster)</p>
                                    </div>
                                    <Toggle checked={engineCfg.ngram_spec} onChange={v => setEng('ngram_spec', v)} />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                            <span className="text-sm text-neutral-400">{engineStatus}</span>
                            <button
                                type="button"
                                onClick={saveEngineConfig}
                                disabled={engineSaving}
                                className="bg-white text-black hover:bg-neutral-200 px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {engineSaving && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                {engineSaving ? 'Applying...' : 'Apply Engine Config'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── LLM GENERATION SETTINGS ─────────────────────────────── */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Persona / System Prompt */}
                    <div className="bg-[#0a0a0a]/40 border border-[#171717] p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 mb-4">System Prompt Persona</h3>
                        <textarea
                            {...register("system_prompt")}
                            className="w-full bg-[#0a0a0a]/70 border border-[#262626] rounded-xl p-4 text-neutral-300 font-mono text-sm min-h-[150px] focus:outline-none focus:border-neutral-600 custom-scrollbar"
                            placeholder="You are a helpful AI assistant..."
                        />
                        {errors.system_prompt && <p className="text-rose-400 text-xs mt-1">{errors.system_prompt.message}</p>}
                        <p className="text-xs text-neutral-500 mt-2">This instruction runs on every request. Tailor it to be a specific expert.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Context Window */}
                        <div className="bg-[#0a0a0a]/40 border border-[#171717] p-6 rounded-2xl">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 mb-4">Context Window Size</h3>
                            <select
                                {...register("context_size", { valueAsNumber: true })}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neutral-500 cursor-pointer"
                            >
                                <option value={4096}>4096 (Default) — Low RAM</option>
                                <option value={8192}>8192 — Standard</option>
                                <option value={16384}>16384 — High RAM (16K)</option>
                                <option value={32768}>32768 — Max (32K)</option>
                            </select>
                            {errors.context_size && <p className="text-rose-400 text-xs mt-1">{errors.context_size.message}</p>}
                            <p className="text-[11px] text-yellow-500/70 mt-2">⚠ Changing this will restart the LLM engine.</p>
                        </div>

                        {/* Temperature & Top P */}
                        <div className="bg-[#0a0a0a]/40 border border-[#171717] p-6 rounded-2xl">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 mb-4">Generation Parameters</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-neutral-400">Temperature</span>
                                        <span className="text-white font-mono">{temperature}</span>
                                    </div>
                                    <input type="range" min="0" max="1" step="0.1" {...register("temperature", { valueAsNumber: true })} className="w-full accent-white" />
                                    <p className="text-[10px] text-neutral-500 mt-1">Lower = Precise. Higher = Creative.</p>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-neutral-400">Top P</span>
                                        <span className="text-white font-mono">{top_p}</span>
                                    </div>
                                    <input type="range" min="0" max="1" step="0.1" {...register("top_p", { valueAsNumber: true })} className="w-full accent-white" />
                                    <p className="text-[10px] text-neutral-500 mt-1">Limits vocabulary to top probability mass.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-[#171717]/50">
                        <div className="text-sm font-medium text-white flex items-center gap-2">
                            {status && (
                                <span className="fade-in flex items-center gap-2">
                                    {status.includes("Saving") && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                    {status}
                                </span>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={saveSettingsMutation.isPending}
                            className="bg-white text-black hover:bg-neutral-200 px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-white/10 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {saveSettingsMutation.isPending ? 'Applying Changes...' : 'Save Configuration'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}
