import React, { useState, useEffect, useRef } from 'react';

export default function PlanningArea() {
    // Load config from localStorage or fallback defaults
    const [targetDirs, setTargetDirs] = useState(() => {
        const saved = localStorage.getItem("robit_planning_target_dirs");
        return saved ? JSON.parse(saved) : ["."];
    });
    
    const [selectedSaveDir, setSelectedSaveDir] = useState(() => {
        const saved = localStorage.getItem("robit_planning_save_dir");
        return saved || ".";
    });

    const [filename, setFilename] = useState(() => {
        return localStorage.getItem("robit_planning_filename") || "implementation_plan.md";
    });

    const [techStack, setTechStack] = useState(() => {
        return localStorage.getItem("robit_planning_tech_stack") || "";
    });

    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem("robit_planning_messages");
        return saved ? JSON.parse(saved) : [];
    });

    // Interactive states
    const [inputText, setInputText] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPickingDir, setIsPickingDir] = useState(false);
    const [isIndexing, setIsIndexing] = useState(false);
    const [isDetectingTech, setIsDetectingTech] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success'|'error', text: '' }
    const [savingIndex, setSavingIndex] = useState(null); // index of message being saved

    const chatEndRef = useRef(null);

    // Save states to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("robit_planning_target_dirs", JSON.stringify(targetDirs));
    }, [targetDirs]);

    useEffect(() => {
        localStorage.setItem("robit_planning_save_dir", selectedSaveDir);
    }, [selectedSaveDir]);

    useEffect(() => {
        localStorage.setItem("robit_planning_filename", filename);
    }, [filename]);

    useEffect(() => {
        localStorage.setItem("robit_planning_tech_stack", techStack);
    }, [techStack]);

    useEffect(() => {
        localStorage.setItem("robit_planning_messages", JSON.stringify(messages));
    }, [messages]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isGenerating]);

    // Auto-highlight code blocks inside the chat
    useEffect(() => {
        if (window.hljs) {
            setTimeout(() => {
                const codeBlocks = document.querySelectorAll('.prose-chat pre code');
                codeBlocks.forEach((block) => {
                    window.hljs.highlightElement(block);
                });
            }, 100);
        }
    }, [messages, isGenerating]);

    // Action Handlers
    const handleAddFolder = async () => {
        setIsPickingDir(true);
        setStatus(null);
        try {
            const res = await fetch('/api/planning/select-dir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success && typeof data.directory === 'string' && data.directory.trim() !== '') {
                const newDir = data.directory;
                if (!targetDirs.includes(newDir)) {
                    const newDirs = [...targetDirs, newDir];
                    setTargetDirs(newDirs);
                    if (selectedSaveDir === "." || targetDirs.length === 0) {
                        setSelectedSaveDir(newDir);
                    }
                    setStatus({ type: 'success', text: `Folder ditambahkan: ${newDir}` });
                    setTimeout(() => setStatus(null), 3000);
                } else {
                    setStatus({ type: 'error', text: 'Folder sudah ada di daftar project.' });
                }
            } else if (data.error) {
                setStatus({ type: 'error', text: data.error });
            }
        } catch (err) {
            setStatus({ type: 'error', text: `Gagal memilih folder: ${err.message}` });
        } finally {
            setIsPickingDir(false);
        }
    };

    const handleRemoveFolder = (idxToRemove) => {
        const newDirs = targetDirs.filter((_, idx) => idx !== idxToRemove);
        setTargetDirs(newDirs);
        if (newDirs.length > 0) {
            if (!newDirs.includes(selectedSaveDir)) {
                setSelectedSaveDir(newDirs[0]);
            }
        } else {
            setSelectedSaveDir(".");
        }
    };

    const handleDetectTech = async () => {
        if (targetDirs.length === 0) {
            setStatus({ type: 'error', text: 'Tambahkan folder project terlebih dahulu.' });
            return;
        }
        setIsDetectingTech(true);
        setStatus(null);
        try {
            const res = await fetch('/api/planning/detect-tech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_dirs: targetDirs })
            });
            const data = await res.json();
            if (data.success) {
                setTechStack(data.tech_stack);
                setStatus({ type: 'success', text: `Berhasil mendeteksi tech stack: ${data.tech_stack}` });
                setTimeout(() => setStatus(null), 3000);
            } else {
                setStatus({ type: 'error', text: data.error || 'Gagal mendeteksi stack.' });
            }
        } catch (err) {
            setStatus({ type: 'error', text: `Kesalahan deteksi stack: ${err.message}` });
        } finally {
            setIsDetectingTech(false);
        }
    };

    const handleIndexAll = async () => {
        if (targetDirs.length === 0) {
            setStatus({ type: 'error', text: 'Tambahkan folder project terlebih dahulu.' });
            return;
        }
        setIsIndexing(true);
        setStatus(null);
        try {
            const res = await fetch('/api/planning/index-codebase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_dirs: targetDirs })
            });
            const data = await res.json();
            if (data.success) {
                setStatus({ type: 'success', text: `Project berhasil diindeks: ${data.message}` });
            } else {
                setStatus({ type: 'error', text: data.error || 'Gagal mengindeks project.' });
            }
        } catch (err) {
            setStatus({ type: 'error', text: `Kesalahan saat mengindeks: ${err.message}` });
        } finally {
            setIsIndexing(false);
        }
    };

    const handleSendMessage = async (e, quickText = "") => {
        if (e) e.preventDefault();
        const text = (quickText || inputText).trim();
        if (!text || isGenerating) return;

        setInputText("");
        setStatus(null);

        // Add User message
        const newMsgs = [...messages, { role: "user", content: text }];
        setMessages(newMsgs);
        setIsGenerating(true);

        // Add placeholder Assistant message for streaming
        const streamedMsgs = [...newMsgs, { role: "assistant", content: "" }];
        setMessages(streamedMsgs);

        try {
            const response = await fetch('/api/planning/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMsgs,
                    target_dirs: targetDirs,
                    tech_stack: techStack
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server returned ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullAIResponse = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunkStr = decoder.decode(value, { stream: true });
                const lines = chunkStr.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') break;
                        try {
                            const dataObj = JSON.parse(dataStr);
                            if (dataObj.choices[0]?.delta?.content) {
                                fullAIResponse += dataObj.choices[0].delta.content;
                                setMessages(prev => {
                                    const next = [...prev];
                                    next[next.length - 1] = {
                                        role: "assistant",
                                        content: fullAIResponse
                                    };
                                    return next;
                                });
                            }
                        } catch (e) {}
                    }
                }
            }
        } catch (err) {
            setStatus({ type: 'error', text: `Error streaming plan: ${err.message}` });
            // Remove the empty assistant bubble on error
            setMessages(newMsgs);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSavePlan = async (msgIndex, content) => {
        setSavingIndex(msgIndex);
        setStatus(null);
        try {
            const res = await fetch('/api/planning/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: filename,
                    target_dir: selectedSaveDir,
                    content: content
                })
            });
            const data = await res.json();
            if (data.success) {
                setStatus({
                    type: 'success',
                    text: `Rencana berhasil disimpan ke: ${data.filepath}`
                });
            } else {
                setStatus({ type: 'error', text: data.error || 'Gagal menyimpan file rencana.' });
            }
        } catch (err) {
            setStatus({ type: 'error', text: `Gagal menyimpan: ${err.message}` });
        } finally {
            setSavingIndex(null);
        }
    };

    const handleCopy = (content) => {
        navigator.clipboard.writeText(content);
        setStatus({ type: 'success', text: 'Salin ke clipboard berhasil!' });
        setTimeout(() => setStatus(null), 3000);
    };

    const handleDownload = (content) => {
        const element = document.createElement("a");
        const file = new Blob([content], { type: 'text/markdown' });
        element.href = URL.createObjectURL(file);
        element.download = filename || "implementation_plan.md";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleClearChat = () => {
        if (window.confirm("Yakin ingin menghapus seluruh chat planning ini?")) {
            setMessages([]);
            setStatus(null);
        }
    };

    const getMarkdownHtml = (markdownContent) => {
        if (!markdownContent) return { __html: "" };
        try {
            return { __html: window.marked ? window.marked.parse(markdownContent) : markdownContent };
        } catch (e) {
            return { __html: markdownContent };
        }
    };

    return (
        <section id="planning-view" className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
            {/* Top Header */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-transparent shrink-0">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-cyan-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.0" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                    </svg>
                    <h2 className="text-sm font-bold text-white tracking-wider uppercase">AI Code Planner Chat</h2>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-cyan-400/80 font-bold bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {targetDirs.length} Project Folder
                    </span>
                    <div className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
                        Antigravity 2.0 Mode
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left Config Sidebar: Folders List & Settings */}
                <div className="w-[320px] border-r border-white/5 bg-[#0f172a]/20 p-5 flex flex-col overflow-y-auto custom-scrollbar shrink-0 gap-6">
                    
                    {/* Project Folders Manager */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Daftar Project / Folder</label>
                            <button
                                type="button"
                                onClick={handleAddFolder}
                                disabled={isPickingDir}
                                className="px-2 py-1 bg-[#1e293b] hover:bg-[#2e3e56] border border-white/5 rounded-lg text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-all"
                            >
                                {isPickingDir ? "..." : "+ Tambah"}
                            </button>
                        </div>
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                            {targetDirs.length === 0 ? (
                                <p className="text-[10px] text-slate-600 italic">Belum ada folder ditambahkan. Klik "+ Tambah".</p>
                            ) : (
                                targetDirs.map((dir, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-[#070b13]/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono">
                                        <span className="truncate flex-1" title={dir}>
                                            {dir === "." ? "./ (Project Root)" : dir}
                                        </span>
                                        <button 
                                            onClick={() => handleRemoveFolder(idx)} 
                                            className="ml-2 text-slate-500 hover:text-rose-400 transition-colors"
                                            title="Hapus Folder"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleIndexAll}
                            disabled={isIndexing || targetDirs.length === 0}
                            className="w-full mt-3 bg-cyan-950/40 hover:bg-cyan-950/70 text-cyan-400 border border-cyan-500/20 rounded-xl py-2 px-3 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                        >
                            {isIndexing ? (
                                <>
                                    <svg className="animate-spin h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Mengindeks Project...
                                </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17.5M8 5h8M8 19h8"></path>
                                    </svg>
                                    Indeks Codebase (RAG)
                                </>
                            )}
                        </button>
                    </div>

                    {/* Tech Stack Setting */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Tech Stack (Opsional)</label>
                            <button
                                type="button"
                                onClick={handleDetectTech}
                                disabled={isDetectingTech || targetDirs.length === 0}
                                className="px-2 py-0.5 bg-[#1e293b] hover:bg-[#2e3e56] border border-white/5 rounded-lg text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-all"
                            >
                                {isDetectingTech ? "..." : "Deteksi"}
                            </button>
                        </div>
                        <input 
                            type="text"
                            value={techStack}
                            onChange={(e) => setTechStack(e.target.value)}
                            placeholder="React, Python, FastAPI, dll"
                            className="w-full bg-[#070b13] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600 font-mono"
                        />
                    </div>

                    {/* Saving Locations & Storage Directory */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Folder Penyimpanan Rencana</label>
                            <select
                                value={selectedSaveDir}
                                onChange={(e) => setSelectedSaveDir(e.target.value)}
                                className="w-full bg-[#070b13] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
                            >
                                <option value=".">./ (Project Root)</option>
                                {targetDirs.filter(d => d !== ".").map((dir, idx) => (
                                    <option key={idx} value={dir}>{dir}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nama File Rencana (.md)</label>
                            <input 
                                type="text"
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                placeholder="implementation_plan.md"
                                className="w-full bg-[#070b13] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
                            />
                        </div>
                    </div>

                    {/* Clear Chat Button */}
                    <div className="mt-auto pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={handleClearChat}
                            className="w-full bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 text-rose-400 text-xs font-semibold py-2.5 rounded-xl transition-all"
                        >
                            Reset / Clear Chat
                        </button>
                    </div>

                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#070b12]/40 relative">
                    
                    {/* Status Alerts Alert Banner */}
                    {status && (
                        <div className={`p-4 mx-6 mt-6 rounded-xl flex items-center gap-3 border text-sm font-medium shrink-0 z-20 ${
                            status.type === 'success' 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-fade-in' 
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-fade-in'
                        }`}>
                            <span>{status.text}</span>
                            <button className="ml-auto text-xs opacity-60 hover:opacity-100" onClick={() => setStatus(null)}>✕</button>
                        </div>
                    )}

                    {/* Message list */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar select-text">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto p-6">
                                <div className="w-14 h-14 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 shadow-lg shadow-cyan-500/5 animate-pulse">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-white mb-2">Selamat Datang di Code Planner Chat</h3>
                                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                                    Tuliskan perubahan atau fitur yang ingin Anda tambahkan pada codebase. AI secara otomatis mencari potongan kode relevan dari project-project Anda yang telah diindeks dan memformulasikan rencana implementasi Markdown.
                                </p>
                                
                                {/* Quick Replies templates */}
                                <div className="grid grid-cols-1 gap-2.5 w-full">
                                    <button 
                                        onClick={(e) => handleSendMessage(e, "Buat rencana implementasi fitur Dark Mode / Light Mode toggle.")}
                                        className="text-left bg-[#070b13]/60 hover:bg-[#0f172a]/60 border border-white/5 hover:border-cyan-500/30 rounded-xl p-3.5 text-xs text-slate-300 transition-all font-semibold"
                                    >
                                        💡 "Buat rencana implementasi fitur Dark Mode / Light Mode toggle."
                                    </button>
                                    <button 
                                        onClick={(e) => handleSendMessage(e, "Tulis unit test untuk router backend Python yang sudah ada.")}
                                        className="text-left bg-[#070b13]/60 hover:bg-[#0f172a]/60 border border-white/5 hover:border-cyan-500/30 rounded-xl p-3.5 text-xs text-slate-300 transition-all font-semibold"
                                    >
                                        🛠️ "Tulis unit test untuk router backend Python yang sudah ada."
                                    </button>
                                    <button 
                                        onClick={(e) => handleSendMessage(e, "Jelaskan struktur file/komponen utama dalam project ini.")}
                                        className="text-left bg-[#070b13]/60 hover:bg-[#0f172a]/60 border border-white/5 hover:border-cyan-500/30 rounded-xl p-3.5 text-xs text-slate-300 transition-all font-semibold"
                                    >
                                        📁 "Jelaskan struktur file/komponen utama dalam project ini."
                                    </button>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] rounded-2xl p-4.5 text-sm leading-relaxed ${
                                        msg.role === 'user' 
                                            ? 'bg-cyan-950/25 border border-cyan-500/10 text-slate-200' 
                                            : 'bg-[#0f172a]/20 border border-white/5 text-slate-300 prose prose-invert prose-chat max-w-none font-sans'
                                    }`}>
                                        
                                        {/* Render Chat bubble content */}
                                        {msg.role === 'user' ? (
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        ) : (
                                            <>
                                                {/* Assistant message content rendered in Markdown */}
                                                <div dangerouslySetInnerHTML={getMarkdownHtml(msg.content)} />
                                                
                                                {/* Action Bar below assistant responses */}
                                                {msg.content && (
                                                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5 shrink-0">
                                                        <button 
                                                            onClick={() => handleCopy(msg.content)}
                                                            className="px-2.5 py-1.5 bg-[#1e293b]/60 hover:bg-[#1e293b] border border-white/5 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white transition-colors"
                                                            title="Salin Markdown"
                                                        >
                                                            Copy
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDownload(msg.content)}
                                                            className="px-2.5 py-1.5 bg-[#1e293b]/60 hover:bg-[#1e293b] border border-white/5 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white transition-colors"
                                                            title="Unduh .md"
                                                        >
                                                            Download
                                                        </button>
                                                        <button 
                                                            onClick={() => handleSavePlan(idx, msg.content)}
                                                            disabled={savingIndex === idx}
                                                            className="ml-auto px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                                                            title={`Simpan rencana ke: ${selectedSaveDir}/${filename}`}
                                                        >
                                                            {savingIndex === idx ? (
                                                                "Menyimpan..."
                                                            ) : (
                                                                <>
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                                                                    </svg>
                                                                    Simpan Rencana
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Bottom Input bar */}
                    <div className="p-6 bg-gradient-to-t from-[#070b12] to-[#070b12]/0 border-t border-white/5 shrink-0">
                        <form onSubmit={handleSendMessage} className="relative flex items-end gap-3 bg-[#070b13] border border-white/10 hover:border-cyan-500/30 focus-within:border-cyan-500/50 rounded-2xl p-2 transition-all">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                placeholder={isGenerating ? "AI sedang berfikir..." : "Tulis alur atau goal coding baru yang ingin di-generate implementasinya..."}
                                disabled={isGenerating}
                                rows={2}
                                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none resize-none pl-3 pr-12 py-2.5 leading-relaxed custom-scrollbar"
                            />
                            
                            <button
                                type="submit"
                                disabled={isGenerating || !inputText.trim()}
                                className="absolute right-3.5 bottom-3.5 w-8 h-8 bg-cyan-500 hover:bg-cyan-600 disabled:bg-[#1e293b] rounded-xl text-white font-semibold transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <svg className="animate-spin h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                    </svg>
                                )}
                            </button>
                        </form>
                        
                        <div className="flex items-center justify-between text-[9px] text-slate-600 mt-2 px-1 font-mono">
                            <span>Tekan <kbd className="bg-slate-800 text-slate-400 px-1 py-0.5 rounded">Enter</kbd> untuk mengirim, <kbd className="bg-slate-800 text-slate-400 px-1 py-0.5 rounded">Shift+Enter</kbd> baris baru</span>
                            <span>{targetDirs.length > 0 ? `Aktif: ${targetDirs.map(d => dirName(d)).join(", ")}` : "Belum ada project aktif"}</span>
                        </div>
                    </div>

                </div>

            </div>
        </section>
    );
}

// Simple helper to get directory name
function dirName(path) {
    if (!path || typeof path !== "string") return "";
    if (path === ".") return "Root";
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
}
