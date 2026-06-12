import React, { useState, useRef, useEffect } from 'react';
import QAProjectList from './QAProjectList';
import QAScenarioList from './QAScenarioList';

export default function QAArea() {
    const [activeProject, setActiveProject] = useState(null);
    const [activeScenario, setActiveScenario] = useState(null);

    const [prompt, setPrompt] = useState("");
    const [code, setCode] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState([]);
    const [screenshot, setScreenshot] = useState(null);
    
    const logsEndRef = useRef(null);
    const wsRef = useRef(null);

    // Auto-scroll logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    // Load scenario data
    useEffect(() => {
        if (activeScenario) {
            setCode(activeScenario.script_code || "");
            setPrompt("");
            const storedLogs = localStorage.getItem(`qa_logs_${activeScenario.id}`);
            setLogs(storedLogs ? JSON.parse(storedLogs) : []);
            setScreenshot(null);
        }
    }, [activeScenario]);

    // Persist logs to localStorage
    useEffect(() => {
        if (activeScenario) {
            localStorage.setItem(`qa_logs_${activeScenario.id}`, JSON.stringify(logs));
        }
    }, [logs, activeScenario]);

    const saveScenarioData = async (updates) => {
        if (!activeScenario) return;
        const updated = { ...activeScenario, ...updates, updated_at: Date.now() };
        setActiveScenario(updated);
        await fetch('/api/qa/scenarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
    };

    const handleGenerate = async () => {
        if (!prompt || !activeScenario) return;
        setIsGenerating(true);
        setScreenshot(null);
        
        const newMsg = { role: "user", content: prompt };
        const messages = [...(activeScenario.messages || []), newMsg];
        
        try {
            const res = await fetch('/api/qa/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: prompt,
                    messages: messages,
                    target_url: activeProject?.target_url,
                    project_id: activeProject?.id,
                    persist_session: activeProject?.persist_session === 1 || activeProject?.persist_session === true
                })
            });
            const data = await res.json();
            if (data.code) {
                setCode(data.code);
                const assistantMsg = { role: "assistant", content: "Code generated." };
                await saveScenarioData({ 
                    script_code: data.code, 
                    messages: [...messages, assistantMsg] 
                });
                setPrompt("");
            } else if (data.error) {
                setLogs(prev => [...prev, `[Error] ${data.error}`]);
            }
        } catch (err) {
            setLogs(prev => [...prev, `[Error] Failed to generate code: ${err.message}`]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRun = () => {
        if (!code || isRunning) return;
        
        setIsRunning(true);
        saveScenarioData({ status: "running" });
        setLogs(prev => [...prev, "[System] Starting Playwright execution..."]);
        setScreenshot(null);
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/qa/ws`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({ 
                code,
                project_id: activeProject?.persist_session ? activeProject.id : null 
            }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'screenshot') {
                    setScreenshot(data.data);
                } else if (data.type === 'done') {
                    setIsRunning(false);
                    ws.close();
                } else if (data.type === 'log' && data.message.startsWith("Execution finished with code")) {
                    const code = data.message.split("code ")[1];
                    saveScenarioData({ status: code === "0" ? "success" : "failed" });
                    setLogs(prev => [...prev, `[Log] ${data.message}`]);
                } else if (data.type === 'log') {
                    setLogs(prev => [...prev, `[Log] ${data.message}`]);
                }
            } catch (err) {
                console.error("Failed to parse WS message", event.data);
            }
        };

        ws.onerror = (error) => {
            setLogs(prev => [...prev, `[Error] WebSocket connection failed.`]);
            setIsRunning(false);
        };

        ws.onclose = () => {
            setIsRunning(false);
        };
    };

    const handleStop = () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        setIsRunning(false);
        setLogs(prev => [...prev, "[System] Execution stopped by user."]);
    };

    const handleSaveCode = () => {
        saveScenarioData({ script_code: code });
    };

    return (
        <div className="flex h-full bg-[#0a0a0a] text-neutral-300 w-full overflow-hidden font-sans">
            <QAProjectList 
                onSelectProject={(proj) => {
                    setActiveProject(proj);
                    setActiveScenario(null);
                }} 
            />
            {activeProject && (
                <QAScenarioList 
                    project={activeProject} 
                    activeScenario={activeScenario}
                    onSelectScenario={setActiveScenario} 
                />
            )}

            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                {!activeScenario ? (
                    <div className="flex-1 flex items-center justify-center text-neutral-500 flex-col">
                        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        <p>Select or create a scenario to begin testing.</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex justify-between items-center">
                            <div>
                                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    <span className="text-emerald-400">{activeScenario.name}</span>
                                </h1>
                                <p className="text-xs text-neutral-500 mt-1">Project: {activeProject.name} ({activeProject.target_url})</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 mb-4">
                            {/* Chat History Panel */}
                            {activeScenario.messages && activeScenario.messages.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[11px] text-neutral-500 font-bold uppercase tracking-widest">Prompt History</span>
                                        <button 
                                            onClick={async () => {
                                                await saveScenarioData({ messages: [] });
                                                setActiveScenario({ ...activeScenario, messages: [] });
                                            }}
                                            className="text-[10px] text-neutral-400 hover:text-red-400 transition-colors flex items-center gap-1"
                                            title="Clear prompt history"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            Clear
                                        </button>
                                    </div>
                                    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 flex flex-col gap-3 max-h-48 overflow-y-auto custom-scrollbar">
                                        {activeScenario.messages.map((msg, idx) => (
                                            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1 px-1">
                                                    {msg.role === 'user' ? 'You' : 'AI'}
                                                </div>
                                                <div className={`px-3 py-2 rounded-xl text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-emerald-600/20 text-emerald-100 border border-emerald-500/30' : 'bg-black text-neutral-300 border border-neutral-800'}`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Prompt Input Area */}
                            <div className="flex gap-4">
                                <textarea 
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe the test step... (e.g., 'Click the login button and wait')"
                                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-sm text-white resize-none focus:outline-none focus:border-emerald-500 transition-colors custom-scrollbar"
                                    rows="2"
                                    disabled={isGenerating || isRunning}
                                />
                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || isRunning || !prompt.trim()}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/20 whitespace-nowrap flex items-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                        Generate
                                    </>
                                )}
                            </button>
                            </div>
                        </div>

                        {/* Main Split Content */}
                        <div className="flex-1 flex gap-6 overflow-hidden">
                            {/* Left Side: Code & Logs */}
                            <div className="w-1/2 flex flex-col gap-4 overflow-hidden">
                                {/* Code Editor Area */}
                                <div className="flex-1 flex flex-col bg-[#000000] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl relative">
                                    <div className="bg-[#0a0a0a]/60 px-4 py-3 border-b border-neutral-800 flex justify-between items-center shrink-0">
                                        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest font-mono">Playwright Script</span>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={handleSaveCode}
                                                className="text-[10px] text-neutral-400 hover:text-white px-2 py-1 flex items-center gap-1"
                                                title="Save code changes manually"
                                            >
                                                Save
                                            </button>
                                            {!isRunning ? (
                                                <button 
                                                    onClick={handleRun}
                                                    disabled={!code || isGenerating}
                                                    className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                                                    Run Script
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={handleStop}
                                                    className="text-xs bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"></path></svg>
                                                    Stop Execution
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <textarea 
                                        value={code}
                                        onChange={(e) => {
                                            setCode(e.target.value);
                                        }}
                                        onBlur={handleSaveCode}
                                        className="flex-1 w-full bg-transparent text-sm text-indigo-200 font-mono p-4 focus:outline-none resize-none custom-scrollbar"
                                        spellCheck="false"
                                        disabled={isRunning}
                                        placeholder="# AI generated code will appear here..."
                                    />
                                </div>

                                {/* Logs Area */}
                                <div className="h-48 flex flex-col bg-[#000000] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl shrink-0">
                                    <div className="bg-[#0a0a0a]/60 px-4 py-2 border-b border-neutral-800 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">Execution Logs</span>
                                            {logs.length > 0 && (
                                                <button onClick={() => setLogs([])} className="text-[9px] font-mono font-bold text-neutral-400 hover:text-rose-400 px-1.5 py-0.5 rounded transition-colors uppercase tracking-widest">
                                                    Clear Logs
                                                </button>
                                            )}
                                        </div>
                                        {isRunning && (
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                <span className="text-[9px] text-emerald-400/80 font-bold tracking-wider uppercase font-mono">Running</span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 p-3 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-1">
                                        {logs.map((log, i) => (
                                            <div key={i} className={`${log.startsWith('[Error]') ? 'text-rose-400' : 'text-neutral-400'} break-all`}>
                                                {log}
                                            </div>
                                        ))}
                                        {logs.length === 0 && !isRunning && (
                                            <div className="text-neutral-600 italic">No logs yet...</div>
                                        )}
                                        <div ref={logsEndRef} />
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Live Preview */}
                            <div className="w-1/2 flex flex-col bg-[#000000] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
                                <div className="bg-[#0a0a0a]/60 px-4 py-3 border-b border-neutral-800 flex justify-between items-center shrink-0">
                                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest font-mono">Real-time Preview</span>
                                </div>
                                <div className="flex-1 relative flex items-center justify-center p-4 bg-neutral-900/50">
                                    {screenshot ? (
                                        <img 
                                            src={screenshot} 
                                            alt="Live Preview" 
                                            className="max-w-full max-h-full object-contain rounded border border-neutral-700 shadow-xl"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-neutral-600">
                                            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                            <span className="text-sm font-medium">Browser preview will appear here</span>
                                        </div>
                                    )}
                                    {isRunning && (
                                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Live</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
