import React, { useState, useEffect, useRef } from 'react';

const MessageContent = ({ text, isUser, streaming }) => {
    const [previewMode, setPreviewMode] = useState(false);
    const hasHtml = !isUser && /```html\n([\s\S]*?)```/.test(text);

    const renderMarkdown = (content) => {
        if (!content) return { __html: '' };
        try {
          return { __html: window.marked ? window.marked.parse(content) : content };
        } catch(e) {
          return { __html: content };
        }
    };

    if (hasHtml) {
        const htmlMatch = text.match(/```html\n([\s\S]*?)```/);
        const htmlContent = htmlMatch ? htmlMatch[1] : '';
        
        return (
            <div className="w-full">
                {!streaming && (
                    <div className="flex items-center gap-2 mb-3">
                        <button onClick={() => setPreviewMode(false)} className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${!previewMode ? 'bg-neutral-800 text-white' : 'bg-[#171717]/50 text-neutral-400 hover:bg-[#171717]'}`}>Code View</button>
                        <button onClick={() => setPreviewMode(true)} className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${previewMode ? 'bg-neutral-800 text-white' : 'bg-[#171717]/50 text-neutral-400 hover:bg-[#171717]'}`}>UI Preview</button>
                        {previewMode && (
                            <button 
                                onClick={() => {
                                    const blob = new Blob([htmlContent], { type: 'text/html' });
                                    const url = URL.createObjectURL(blob);
                                    window.open(url, '_blank');
                                }} 
                                className="ml-auto flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-[#171717]/50 text-white hover:bg-[#171717] hover:text-neutral-300 transition-colors"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                Open in New Tab
                            </button>
                        )}
                    </div>
                )}
                
                {previewMode && !streaming ? (
                    <div className="bg-white rounded-xl overflow-hidden w-full h-[600px] border border-neutral-700 shadow-2xl relative group">
                        <iframe 
                            srcDoc={htmlContent} 
                            className="w-full h-full border-none bg-white"
                            sandbox="allow-scripts allow-same-origin"
                            title="HTML Preview"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 pointer-events-none transition-colors"></div>
                    </div>
                ) : (
                    <div 
                      className={`prose prose-invert prose-p:leading-relaxed max-w-none ${isUser ? 'bg-neutral-800 border border-white/30 px-5 py-3 rounded-2xl rounded-tr-sm text-white100' : 'text-neutral-300'}`}
                      dangerouslySetInnerHTML={renderMarkdown(text)} 
                    />
                )}
            </div>
        );
    }

    return (
        <div 
          className={`prose prose-invert prose-p:leading-relaxed max-w-none ${isUser ? 'bg-neutral-800 border border-white/30 px-5 py-3 rounded-2xl rounded-tr-sm text-white100' : 'text-neutral-300'}`}
          dangerouslySetInnerHTML={renderMarkdown(text)} 
        />
    );
};

const isToolResultMsg = (m) => {
    return m.role === 'user' && typeof m.content === 'string' && m.content.startsWith('TOOL RESULT');
};

const ToolResultItem = ({ part }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const match = part.match(/^TOOL RESULT\s+\[([a-zA-Z0-9_]+)\s+([^\]]+)\]:([\s\S]*)$/);
    if (!match) {
        return (
            <div className="bg-[#171717]/30 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-400 font-mono my-2">
                {part}
            </div>
        );
    }

    const toolName = match[1];
    const paramsStr = match[2];
    const output = match[3].trim();

    const paramValMatch = paramsStr.match(/(?:query|url)="([^"]+)"/);
    const paramValue = paramValMatch ? paramValMatch[1] : paramsStr;

    let toolLabel = "";
    let toolIcon = null;

    if (toolName === 'search') {
        toolLabel = `Search Web: "${paramValue}"`;
        toolIcon = (
            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        );
    } else if (toolName === 'scrape') {
        toolLabel = `Web Scraping: ${paramValue}`;
        toolIcon = (
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
        );
    } else if (toolName === 'ask_docs') {
        toolLabel = `Knowledge Base Query: "${paramValue}"`;
        toolIcon = (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
        );
    } else {
        toolLabel = `Tool (${toolName}): ${paramValue}`;
        toolIcon = (
            <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        );
    }

    return (
        <div className="w-full my-2.5 border border-neutral-800/80 bg-[#0a0a0a]/30 rounded-xl overflow-hidden shadow-sm hover:border-neutral-700/50 transition-colors">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#171717]/30 transition-colors text-left"
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1 rounded bg-neutral-800/30 shrink-0">
                        {toolIcon}
                    </div>
                    <span className="text-[11px] font-semibold text-neutral-400 truncate tracking-wide">{toolLabel}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[9px] text-neutral-500 font-semibold bg-[#171717] px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {isOpen ? "Sembunyikan Hasil" : "Lihat Hasil"}
                    </span>
                    <svg 
                        className={`w-3 h-3 text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>
            
            {isOpen && (
                <div className="border-t border-neutral-800 bg-[#000000]/50 px-3.5 py-2.5">
                    <pre className="text-[10px] font-mono text-neutral-400 overflow-x-auto whitespace-pre-wrap max-h-48 custom-scrollbar leading-relaxed">
                        {output || "Tidak ada output dari tool."}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default function ChatArea({ messages, isGenerating, onSend, streamingMsg, toolStatus, chatMode = "all", setChatMode, streamingTps = 0 }) {
  const [inputText, setInputText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMsg, toolStatus]);

  const handleFileAttach = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsExtracting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/extract', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            setAttachedFiles(prev => [...prev, { name: file.name, content: data.text }]);
        }
    } catch(err) {
        console.error("Connection failed", err);
    } finally {
        setIsExtracting(false);
        e.target.value = '';
    }
  };

  const handleSendSubmit = () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    
    let combinedText = inputText.trim();
    if (attachedFiles.length > 0) {
        const filesText = attachedFiles.map(f => `--- FILE: ${f.name} ---\n${f.content}\n--- END FILE ---`).join('\n\n');
        combinedText += `\n\nAttachments:\n${filesText}`;
    }

    onSend(combinedText);
    setInputText("");
    setAttachedFiles([]);
  };

  const removeAttachment = (index) => {
      setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Configure marked to use highlight.js synchronously to prevent React DOM blinking
  useEffect(() => {
    if (window.marked && window.hljs && !window.marked.__configured) {
        window.marked.use({
            renderer: {
                code(token) {
                    const text = typeof token === 'string' ? token : token.text;
                    const lang = typeof token === 'string' ? arguments[1] : token.lang;
                    const language = (lang && window.hljs.getLanguage(lang)) ? lang : 'plaintext';
                    const highlighted = window.hljs.highlight(text, { language }).value;
                    
                    return `<div class="group relative my-4">
                        <button class="copy-btn absolute top-2 right-2 bg-[#171717]/80 hover:bg-neutral-800 text-neutral-300 hover:text-white px-2 py-1 rounded text-xs font-semibold transition-colors border border-neutral-600 opacity-0 group-hover:opacity-100 z-10 cursor-pointer">Copy</button>
                        <pre class="!my-0"><code class="hljs language-${language}">${highlighted}</code></pre>
                    </div>`;
                }
            }
        });
        window.marked.__configured = true;
    }

    // Global event listener for copy buttons generated by marked
    const handleCopy = (e) => {
        if (e.target && e.target.classList.contains('copy-btn')) {
            const container = e.target.closest('div');
            const code = container.querySelector('code');
            if (code) {
                navigator.clipboard.writeText(code.innerText);
                const origText = e.target.innerText;
                e.target.innerText = 'Copied!';
                setTimeout(() => e.target.innerText = origText, 2000);
            }
        }
    };
    document.addEventListener('click', handleCopy);
    return () => document.removeEventListener('click', handleCopy);
  }, []);

  return (
    <section id="chat-view" className="flex-1 flex h-full relative">
        <div className="flex-1 flex flex-col h-full bg-transparent">
            {/* Chat Header info */}
            <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-transparent shrink-0">
                <div className="flex items-center gap-1.5 bg-[#0a0a0a]/60 p-1 rounded-xl border border-neutral-800">
                    <button 
                        onClick={() => setChatMode('all')} 
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${chatMode === 'all' ? 'bg-white/10 text-white border border-white/20' : 'text-neutral-400 hover:text-neutral-200'}`}
                    >
                        Expert Mode
                    </button>
                    <button 
                        onClick={() => setChatMode('rag')} 
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${chatMode === 'rag' ? 'bg-white/10 text-white border border-white/20' : 'text-neutral-400 hover:text-neutral-200'}`}
                    >
                        RAG Only
                    </button>
                    <button 
                        onClick={() => setChatMode('research')} 
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${chatMode === 'research' ? 'bg-white/10 text-white border border-white/20' : 'text-neutral-400 hover:text-neutral-200'}`}
                    >
                        Web Research
                    </button>
                    <button 
                        onClick={() => setChatMode('standard')} 
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${chatMode === 'standard' ? 'bg-white/10 text-white border border-white/20' : 'text-neutral-400 hover:text-neutral-200'}`}
                    >
                        Standard Chat
                    </button>
                </div>
                <div className="text-xs text-neutral-500 flex items-center gap-2">
                    <span>Tool Status:</span>
                    <span className="bg-[#171717] px-2 py-0.5 rounded text-neutral-300 font-mono">{toolStatus || "Idle"}</span>
                </div>
            </div>

            {/* Chat Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="max-w-2xl mx-auto text-center py-12 space-y-4 fade-in">
                        <div className="w-16 h-16 rounded-full bg-white/10 border border-white/30 flex items-center justify-center mx-auto text-white shadow-lg shadow-neutral-900/5">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-white">Welcome to ROBIT Workspace</h2>
                        <p className="text-neutral-400 text-sm max-w-md mx-auto">
                            This dashboard is fully integrated with your local Knowledge Base. Ask questions about the active documents in the RAG tab, or upload an image.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto pt-2">
                            <button onClick={() => setInputText('How does the current architecture work?')} className="bg-[#171717]/80 border border-[#262626]/40 hover:border-white/30 px-3 py-1.5 rounded-lg text-xs text-neutral-300 hover:text-white transition-all">
                                "Explain architecture..."
                            </button>
                            <button onClick={() => setInputText('Summarize the latest document I uploaded.')} className="bg-[#171717]/80 border border-[#262626]/40 hover:border-white/30 px-3 py-1.5 rounded-lg text-xs text-neutral-300 hover:text-white transition-all">
                                "Summarize document..."
                            </button>
                        </div>
                    </div>
                ) : (
                    messages.map((m, i) => {
                        if (isToolResultMsg(m)) {
                            const parts = m.content.split('\n\n---\n\n');
                            return (
                                <div key={i} className="flex justify-start w-full max-w-4xl mx-auto px-4 fade-in">
                                    <div className="w-full max-w-[85%]">
                                        <div className="flex items-center gap-1.5 pl-1 mb-0.5">
                                            <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            </svg>
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Sistem - Eksekusi Tool</span>
                                        </div>
                                        {parts.map((part, idx) => (
                                            <ToolResultItem key={idx} part={part} />
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}>
                                <div className="max-w-[85%]">
                                    <div className="flex items-center gap-2 mb-1 pl-1">
                                        {m.role !== 'user' && (
                                            <div className="w-5 h-5 rounded-md bg-gradient-to-tr bg-neutral-800 flex items-center justify-center shadow-lg">
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                            </div>
                                        )}
                                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{m.role === 'user' ? 'You' : 'ROBIT'}</span>
                                    </div>
                                    <MessageContent text={m.content} isUser={m.role === 'user'} streaming={false} />
                                    
                                    {/* Model Generation Stats */}
                                    {m.role !== 'user' && m.stats && (
                                        <div className="flex items-center gap-2.5 mt-2 pl-1.5 text-[10px] text-neutral-500 font-mono select-none">
                                            {m.stats.tps && <span>⚡ {parseFloat(m.stats.tps).toFixed(1)} t/s</span>}
                                            {m.stats.tps && (m.stats.prompt_tokens || m.stats.completion_tokens) && <span>•</span>}
                                            {m.stats.prompt_tokens && <span>prompt: {m.stats.prompt_tokens} tok</span>}
                                            {m.stats.prompt_tokens && m.stats.completion_tokens && <span>•</span>}
                                            {m.stats.completion_tokens && <span>gen: {m.stats.completion_tokens} tok</span>}
                                        </div>
                                    )}

                                    {/* Citations Badges */}
                                    {m.role !== 'user' && m.citations && m.citations.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-[#171717]/50 max-w-xl">
                                            <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Citations:</span>
                                            {m.citations.map((doc, idx) => (
                                                <div key={idx} className="inline-flex items-center gap-1.5 bg-[#171717]/45 border border-[#262626]/45 rounded-lg px-2.5 py-0.5 text-[10px] text-white/90 font-semibold shadow-sm">
                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                    </svg>
                                                    {doc}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                
                {isGenerating && (
                    <div className="flex justify-start fade-in">
                        <div className="max-w-[85%]">
                            <div className="flex items-center gap-2 mb-1 pl-1">
                                <div className="w-5 h-5 rounded-md bg-gradient-to-tr bg-neutral-800 flex items-center justify-center shadow-lg">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                </div>
                                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">ROBIT</span>
                            </div>
                            <div className="prose prose-invert max-w-none text-neutral-300">
                                {streamingMsg ? (
                                    <>
                                        <MessageContent text={streamingMsg} isUser={false} streaming={true} />
                                        <div className="flex items-center gap-2 mt-2 pl-1.5 text-[10px] text-neutral-500 font-mono select-none animate-pulse">
                                            <span>⚡ Generating...</span>
                                            {streamingTps > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{streamingTps.toFixed(1)} t/s</span>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-1 h-6">
                                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24"><circle className="typing-dot" cx="4" cy="12" r="3"/><circle className="typing-dot" cx="12" cy="12" r="3"/><circle className="typing-dot" cx="20" cy="12" r="3"/></svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {/* Input Bar Container */}
            <div className="p-4 border-t border-neutral-800 bg-transparent relative shrink-0">
                <div className="max-w-4xl mx-auto relative">
                    {/* Typing Indicator / Extraction Info */}
                    {isExtracting && (
                        <div className="absolute -top-8 left-2 flex items-center gap-2 bg-[#171717] px-3 py-1 rounded-full border border-neutral-800 text-[11px] text-white fade-in">
                            <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>ROBIT is extracting document...</span>
                        </div>
                    )}

                    {/* Chat Input */}
                    <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-white/50 focus-within:border-neutral-600 transition-all flex flex-col gap-2">
                        {attachedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 px-2 pt-2">
                                {attachedFiles.map((file, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-[#171717] border border-neutral-700 px-2 py-1 rounded-lg text-xs text-neutral-300">
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                        <span className="truncate max-w-[120px]">{file.name}</span>
                                        <button onClick={() => removeAttachment(i)} className="text-neutral-500 hover:text-rose-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"></path></svg></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <textarea 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if(!isGenerating && !isExtracting) handleSendSubmit();
                                }
                            }}
                            rows="2" 
                            placeholder={
                                chatMode === "all" ? "Tanyakan apa saja... RAG & Pencarian Web aktif." :
                                chatMode === "rag" ? "Tanyakan tentang dokumen Anda... RAG aktif." :
                                chatMode === "research" ? "Lakukan riset... Pencarian Web aktif." :
                                "Ketik pesan di sini... Mode Chat Standar (tanpa tool)."
                            }
                            className="w-full bg-transparent border-0 ring-0 outline-none focus:ring-0 focus:outline-none text-neutral-100 placeholder-neutral-500 px-3 py-1.5 resize-none text-sm leading-relaxed custom-scrollbar"
                            disabled={isGenerating || isExtracting}
                        ></textarea>
                        
                        <div className="flex items-center justify-between border-t border-[#171717] pt-2 px-2.5 pb-1">
                            {/* Attachment Button */}
                            <div className="flex items-center gap-2">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={handleFileAttach}
                                    accept=".pdf,.txt,.md,.json,.js,.py,.html,.css,image/*"
                                />
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-[#171717] transition-colors"
                                    title="Attach File or Image"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                </button>
                                <span className="text-[11px] text-neutral-500">
                                    {chatMode === "all" ? "All Tools Active (RAG & Web Search)" :
                                     chatMode === "rag" ? "RAG Mode Active" :
                                     chatMode === "research" ? "Web Research Active" :
                                     "Standard Chat Active"}
                                </span>
                            </div>
                            
                            {/* Send Button */}
                            <button 
                                onClick={handleSendSubmit}
                                disabled={isGenerating || isExtracting || (!inputText.trim() && attachedFiles.length === 0)}
                                className=" bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:grayscale text-white px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-white/10 active:scale-95 transition-all"
                            >
                                Send
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* RIGHT SPLIT PANEL: Preview Kutipan / RAG Inspector */}
        {inspectorOpen && (
            <div className="w-80 border-l border-[#171717] bg-[#0a0a0a]/95 flex flex-col h-full z-10 shrink-0">
                <div className="h-14 border-b border-[#171717] flex items-center justify-between px-4 bg-[#0a0a0a] shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-white400"></span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">RAG Inspector</h3>
                    </div>
                    <button onClick={() => setInspectorOpen(false)} className="text-neutral-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                    <div className="bg-[#171717]/40 rounded-xl p-3 border border-[#262626]/40">
                        <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mb-1">Status</label>
                        <span className="text-xs font-semibold text-white block truncate">Integration Ready</span>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Source Context</label>
                        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-neutral-800 text-xs leading-relaxed text-neutral-300 h-96 overflow-y-auto select-text whitespace-pre-wrap custom-scrollbar">
                            RAG Inspector is currently a placeholder for when we implement detailed source citation. Context chunks sent to the LLM will appear here.
                        </div>
                    </div>
                </div>
            </div>
        )}
    </section>
  );
}
