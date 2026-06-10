import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings, useSaveSettings } from '../hooks/useQueries';

const settingsSchema = z.object({
    system_prompt: z.string().min(1, "System prompt cannot be empty"),
    context_size: z.number().min(512, "Minimum context size is 512"),
    temperature: z.number().min(0).max(1),
    top_p: z.number().min(0).max(1)
});

export default function SettingsArea() {
    const { data: initialSettings, isLoading } = useSettings();
    const saveSettingsMutation = useSaveSettings();
    const [status, setStatus] = useState("");

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
        if (initialSettings) {
            reset(initialSettings);
        }
    }, [initialSettings, reset]);

    const temperature = watch("temperature");
    const top_p = watch("top_p");

    const onSubmit = (data) => {
        setStatus("Saving...");
        saveSettingsMutation.mutate(data, {
            onSuccess: () => {
                setStatus("✅ Settings saved successfully!");
                setTimeout(() => setStatus(""), 3000);
            },
            onError: () => {
                setStatus("❌ Error saving settings");
                setTimeout(() => setStatus(""), 3000);
            }
        });
    };

    if (isLoading) return <div className="text-white p-8">Loading settings...</div>;

    return (
        <section id="settings-view" className="flex-1 overflow-y-auto bg-transparent p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight flex items-center gap-3">
                        <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        Advanced Settings
                    </h1>
                    <p className="text-slate-400">Fine-tune the LLM generation parameters and system prompt behavior.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Persona / System Prompt */}
                    <div className="bg-[#0f172a]/40 border border-[#1e293b] p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">System Prompt Persona</h3>
                        <textarea 
                            {...register("system_prompt")}
                            className="w-full bg-[#111827]/70 border border-[#22304d] rounded-xl p-4 text-slate-300 font-mono text-sm min-h-[150px] focus:outline-none focus:border-cyan-500/50 custom-scrollbar"
                            placeholder="You are a helpful AI assistant..."
                        />
                        {errors.system_prompt && <p className="text-rose-400 text-xs mt-1">{errors.system_prompt.message}</p>}
                        <p className="text-xs text-slate-500 mt-2">This instruction runs on every request. Tailor it to be a specific expert (e.g. "You are an elite developer...").</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Context Window */}
                        <div className="bg-[#0f172a]/40 border border-[#1e293b] p-6 rounded-2xl relative overflow-hidden group">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">Context Window Size</h3>
                            <select 
                                {...register("context_size", { valueAsNumber: true })}
                                className="w-full bg-[#111827]/70 border border-[#22304d] rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500/50"
                            >
                                <option value="4096">4096 (Default) - Low RAM</option>
                                <option value="8192">8192 - Standard</option>
                                <option value="16384">16384 - High RAM (16K)</option>
                                <option value="32768">32768 - Max (32K)</option>
                            </select>
                            {errors.context_size && <p className="text-rose-400 text-xs mt-1">{errors.context_size.message}</p>}
                            <p className="text-[11px] text-yellow-500/70 mt-2">Warning: Changing Context Size will restart the LLM engine and clear current memory cache.</p>
                        </div>

                        {/* Temperature & Top P */}
                        <div className="bg-[#0f172a]/40 border border-[#1e293b] p-6 rounded-2xl relative overflow-hidden group">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">Generation Parameters</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">Temperature</span>
                                        <span className="text-cyan-400 font-mono">{temperature}</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="1" step="0.1" 
                                        {...register("temperature", { valueAsNumber: true })}
                                        className="w-full accent-cyan-500"
                                    />
                                    {errors.temperature && <p className="text-rose-400 text-xs mt-1">{errors.temperature.message}</p>}
                                    <p className="text-[10px] text-slate-500 mt-1">Lower = Precise & Strict. Higher = Creative & Diverse.</p>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">Top P</span>
                                        <span className="text-cyan-400 font-mono">{top_p}</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="1" step="0.1" 
                                        {...register("top_p", { valueAsNumber: true })}
                                        className="w-full accent-cyan-500"
                                    />
                                    {errors.top_p && <p className="text-rose-400 text-xs mt-1">{errors.top_p.message}</p>}
                                    <p className="text-[10px] text-slate-500 mt-1">Limits vocabulary to top probability mass.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-[#1e293b]/50">
                        <div className="text-sm font-medium text-cyan-400 flex items-center gap-2">
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
                            className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {saveSettingsMutation.isPending ? 'Applying Changes...' : 'Save Configuration'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}
