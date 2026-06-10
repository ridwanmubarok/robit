import React, { useState, useEffect } from 'react';

export default function PlanningArea() {
    const [featureName, setFeatureName] = useState("");
    const [techStack, setTechStack] = useState("");
    const [filesScope, setFilesScope] = useState("");
    const [filename, setFilename] = useState("implementation_plan.md");
    const [requirements, setRequirements] = useState("");
    
    const [planContent, setPlanContent] = useState("");
    const [activeTab, setActiveTab] = useState("preview"); // 'preview' | 'edit'
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success'|'error', text: '' }

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!featureName.trim() || !requirements.trim()) {
            setStatus({ type: 'error', text: 'Nama Fitur dan Deskripsi Kebutuhan wajib diisi.' });
            return;
        }

        setIsGenerating(true);
        setStatus(null);
        setPlanContent("");

        try {
            const res = await fetch('/api/planning/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    feature_name: featureName,
                    tech_stack: techStack,
                    requirements: requirements,
                    files_scope: filesScope
                })
            });

            const data = await res.json();
            if (data.success) {
                setPlanContent(data.plan);
                setActiveTab("preview");
            } else {
                setStatus({ type: 'error', text: data.error || 'Gagal membuat plan.' });
            }
        } catch (err) {
            setStatus({ type: 'error', text: `Terjadi kesalahan koneksi: ${err.message}` });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveToWorkspace = async () => {
        if (!planContent.trim()) return;

        setIsSaving(true);
        setStatus(null);

        try {
            const res = await fetch('/api/planning/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: filename,
                    content: planContent
                })
            });

            const data = await res.json();
            if (data.success) {
                setStatus({ 
                    type: 'success', 
                    text: `Berhasil disimpan ke workspace sebagai '${data.filename}'!` 
                });
            } else {
                setStatus({ type: 'error', text: data.error || 'Gagal menyimpan file.' });
            }
        } catch (err) {
            setStatus({ type: 'error', text: `Terjadi kesalahan saat menyimpan: ${err.message}` });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(planContent);
        setStatus({ type: 'success', text: 'Salin ke clipboard berhasil!' });
        setTimeout(() => setStatus(null), 3000);
    };

    const handleDownload = () => {
        const element = document.createElement("a");
        const file = new Blob([planContent], { type: 'text/markdown' });
        element.href = URL.createObjectURL(file);
        element.download = filename || "implementation_plan.md";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const getMarkdownHtml = () => {
        if (!planContent) return "";
        return { __html: window.marked ? window.marked.parse(planContent) : planContent };
    };

    // Auto-highlight code blocks after render
    useEffect(() => {
        if (activeTab === 'preview' && planContent && window.hljs) {
            setTimeout(() => {
                const codeBlocks = document.querySelectorAll('#preview-container pre code');
                codeBlocks.forEach((block) => {
                    window.hljs.highlightElement(block);
                });
            }, 100);
        }
    }, [planContent, activeTab]);

    return (
        <section id="planning-view" className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
            {/* Header */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-transparent shrink-0">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                    </svg>
                    <h2 className="text-sm font-bold text-white tracking-wider uppercase">AI Coding Planning</h2>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
                    Model Architect Mode
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Form: Inputs */}
                <div className="w-96 border-r border-white/5 bg-[#0f172a]/20 p-6 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
                    <form onSubmit={handleGenerate} className="space-y-5 flex-1 flex flex-col">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nama Fitur / Goal</label>
                            <input 
                                type="text"
                                value={featureName}
                                onChange={(e) => setFeatureName(e.target.value)}
                                placeholder="Contoh: Implementasi Mode Gelap"
                                className="w-full bg-[#070b13] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tech Stack (Opsional)</label>
                            <input 
                                type="text"
                                value={techStack}
                                onChange={(e) => setTechStack(e.target.value)}
                                placeholder="React, Tailwind CSS, LocalStorage"
                                className="w-full bg-[#070b13] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Scope / File Terkait (Opsional)</label>
                            <input 
                                type="text"
                                value={filesScope}
                                onChange={(e) => setFilesScope(e.target.value)}
                                placeholder="ui/src/components/ThemeToggle.jsx"
                                className="w-full bg-[#070b13] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nama File Output</label>
                            <input 
                                type="text"
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                placeholder="implementation_plan.md"
                                className="w-full bg-[#070b13] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600 font-mono"
                            />
                        </div>

                        <div className="flex-1 flex flex-col">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deskripsi Kebutuhan & Fitur</label>
                            <textarea 
                                value={requirements}
                                onChange={(e) => setRequirements(e.target.value)}
                                placeholder="Deskripsikan fitur secara detail di sini. Jelaskan alur kerja, interaksi tombol, data apa saja yang ingin disimpan, atau design spec-nya..."
                                className="w-full flex-1 min-h-[150px] bg-[#070b13] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600 resize-none leading-relaxed"
                                required
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isGenerating}
                            className="w-full bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Men-generate Plan...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                    </svg>
                                    Generate Design & Plan
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Right Panel: Output & Editor */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#070b12]/40 relative">
                    {/* Status Alert Banner */}
                    {status && (
                        <div className={`p-4 mx-6 mt-6 rounded-xl flex items-center gap-3 border text-sm font-medium ${
                            status.type === 'success' 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                            <span>{status.text}</span>
                            <button className="ml-auto text-xs opacity-60 hover:opacity-100" onClick={() => setStatus(null)}>✕</button>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="absolute inset-0 z-10 bg-[#070b13]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6">
                            <div className="relative w-16 h-16 mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 border-r-indigo-400 animate-spin"></div>
                            </div>
                            <h3 className="text-base font-bold text-white mb-2">Mengumpulkan Spesifikasi Arsitektur...</h3>
                            <p className="text-xs text-slate-400 max-w-xs text-center leading-relaxed">
                                AI sedang menganalisis kebutuhan Anda dan menyusun Markdown implementation plan.
                            </p>
                        </div>
                    )}

                    {!planContent && !isGenerating ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="w-16 h-16 rounded-2xl bg-slate-800/40 border border-white/5 flex items-center justify-center text-slate-500 mb-5">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Belum ada Plan yang Dibuat</h3>
                            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                                Masukkan nama fitur dan deskripsi kebutuhan Anda di kolom kiri, lalu klik tombol **Generate Design & Plan**.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Editor Tabs & Plan Options */}
                            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0f172a]/10 shrink-0">
                                <div className="flex items-center gap-1.5 bg-[#0f172a]/60 p-1 rounded-xl border border-white/5">
                                    <button 
                                        onClick={() => setActiveTab('preview')} 
                                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'preview' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Plan Preview
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('edit')} 
                                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'edit' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Raw Editor (.md)
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={handleCopy}
                                        className="px-3 py-1.5 bg-[#1e293b]/60 hover:bg-[#1e293b] border border-white/5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                                        title="Salin Markdown"
                                    >
                                        Copy
                                    </button>
                                    <button 
                                        onClick={handleDownload}
                                        className="px-3 py-1.5 bg-[#1e293b]/60 hover:bg-[#1e293b] border border-white/5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                                        title="Unduh File"
                                    >
                                        Download
                                    </button>
                                    <button 
                                        onClick={handleSaveToWorkspace}
                                        disabled={isSaving}
                                        className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                                        title="Simpan File ke Workspace Lokal"
                                    >
                                        {isSaving ? (
                                            <>
                                                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                                                </svg>
                                                Save to Workspace
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* View panel */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {activeTab === 'preview' ? (
                                    <div 
                                        id="preview-container"
                                        className="prose prose-invert max-w-none text-slate-300 select-text leading-relaxed font-sans"
                                        dangerouslySetInnerHTML={getMarkdownHtml()}
                                    />
                                ) : (
                                    <textarea
                                        value={planContent}
                                        onChange={(e) => setPlanContent(e.target.value)}
                                        className="w-full h-full bg-transparent text-slate-300 font-mono text-sm leading-relaxed border-none resize-none focus:outline-none select-text"
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
