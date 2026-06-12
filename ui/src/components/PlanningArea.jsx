import React, { useState, useEffect, useRef } from 'react';

export default function PlanningArea() {
    // Project states
    const [projects, setProjects] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(null);

    // Active project configurations
    const [targetDirs, setTargetDirs] = useState(["."]);
    const [selectedSaveDir, setSelectedSaveDir] = useState(".");
    const [filename, setFilename] = useState("implementation_plan.md");
    const [techStack, setTechStack] = useState("");
    const [messages, setMessages] = useState([]);

    // Interactive states
    const [inputText, setInputText] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPickingDir, setIsPickingDir] = useState(false);
    const [isIndexing, setIsIndexing] = useState(false);
    const [indexProgress, setIndexProgress] = useState(null);
    const [isDetectingTech, setIsDetectingTech] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success'|'error', text: '' }
    const [syncStatus, setSyncStatus] = useState(null);
    const [savingIndex, setSavingIndex] = useState(null); // index of message being saved
    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', title: '', message: '', inputValue: '', onConfirm: null });

    const checkSyncStatus = async (dirs) => {
        if (!dirs || dirs.length === 0) {
            setSyncStatus(null);
            return;
        }
        try {
            const res = await fetch('/api/planning/index-sync-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_dirs: dirs })
            });
            const data = await res.json();
            if (data.success) {
                setSyncStatus({
                    total: data.total_files,
                    indexed: data.indexed_files,
                    is_synced: data.is_synced
                });
            }
        } catch (e) {
            console.error("Failed to check sync status:", e);
        }
    };

    const chatEndRef = useRef(null);

    // Initial load from SQLite backend
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/planning/projects');
            const data = await res.json();
            if (data.success) {
                setProjects(data.projects);
                if (data.projects.length > 0) {
                    loadProjectData(data.projects[0]);
                } else {
                    handleCreateProject("Default Project");
                }
            }
        } catch (e) {
            console.error("Failed to fetch projects", e);
        }
    };

    const loadProjectData = (proj) => {
        setActiveProjectId(proj.id);
        setTargetDirs(proj.target_dirs || []);
        setSelectedSaveDir(proj.save_dir || ".");
        setFilename(proj.filename || "implementation_plan.md");
        setTechStack(proj.tech_stack || "");
        setMessages(proj.messages || []);
    };

    // Auto-save debounced whenever config/messages change
    const [saveTimer, setSaveTimer] = useState(null);
    useEffect(() => {
        if (!activeProjectId) return;
        
        const projectData = {
            id: activeProjectId,
            name: projects.find(p => p.id === activeProjectId)?.name || "Project",
            target_dirs: targetDirs,
            save_dir: selectedSaveDir,
            filename: filename,
            tech_stack: techStack,
            messages: messages
        };

        if (saveTimer) clearTimeout(saveTimer);
        const timer = setTimeout(async () => {
            try {
                await fetch('/api/planning/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectData)
                });
                setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, ...projectData } : p));
            } catch (e) {
                console.error("Auto-save failed", e);
            }
        }, 1000);
        setSaveTimer(timer);
        
        return () => clearTimeout(timer);
    }, [targetDirs, selectedSaveDir, filename, techStack, messages]);

    // Polling for indexing progress
    const checkIndexStatus = async () => {
        try {
            const res = await fetch('/api/planning/index-status');
            const data = await res.json();
            if (data.status === 'indexing') {
                setIndexProgress(data);
            } else if (data.status === 'done') {
                setIndexProgress(null);
                setIsIndexing(false);
                setStatus({ type: 'success', text: `Project successfully indexed: ${data.message}` });
                checkSyncStatus(targetDirs);
            } else if (data.status === 'error') {
                setIndexProgress(null);
                setIsIndexing(false);
                setStatus({ type: 'error', text: data.message || 'Failed to index project.' });
            } else if (data.status === 'canceled') {
                setIndexProgress(null);
                setIsIndexing(false);
                setStatus({ type: 'error', text: data.message || 'Indexing canceled.' });
            }
        } catch (e) {
            // ignore fetch error
        }
    };

    useEffect(() => {
        let interval;
        if (isIndexing) {
            interval = setInterval(checkIndexStatus, 500);
        } else {
            checkSyncStatus(targetDirs);
        }
        return () => clearInterval(interval);
    }, [isIndexing]);

    useEffect(() => {
        if (!isIndexing) {
            checkSyncStatus(targetDirs);
        }
    }, [targetDirs]);

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

    // Project Handlers
    const openPrompt = (title, defaultVal, onConfirmCallback) => {
        setModalConfig({ isOpen: true, type: 'prompt', title, message: '', inputValue: defaultVal, onConfirm: onConfirmCallback });
    };

    const openConfirm = (title, message, onConfirmCallback) => {
        setModalConfig({ isOpen: true, type: 'confirm', title, message, inputValue: '', onConfirm: onConfirmCallback });
    };

    const closeModal = () => {
        setModalConfig({ isOpen: false, type: '', title: '', message: '', inputValue: '', onConfirm: null });
    };

    const handleCreateProject = (overrideName = null) => {
        if (overrideName) {
            createNewProject(overrideName);
            return;
        }
        openPrompt("New Project Name", `Project ${projects.length + 1}`, (name) => {
            if (name) createNewProject(name);
            closeModal();
        });
    };

    const createNewProject = async (name) => {
        const newProj = {
            name: name,
            target_dirs: ["."],
            save_dir: ".",
            filename: "implementation_plan.md",
            tech_stack: "",
            messages: []
        };
        
        try {
            const res = await fetch('/api/planning/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProj)
            });
            const data = await res.json();
            if (data.success) {
                setProjects(prev => [data.project, ...prev]);
                loadProjectData(data.project);
                setStatus({ type: 'success', text: `Project '${name}' created.` });
            }
        } catch (e) {
            setStatus({ type: 'error', text: `Failed to create project: ${e.message}` });
        }
    };

    const handleSelectProject = (projId) => {
        const proj = projects.find(p => p.id === projId);
        if (proj) {
            loadProjectData(proj);
        }
    };

    const handleDeleteProject = (projId) => {
        const projName = projects.find(p => p.id === projId)?.name;
        openConfirm("Delete Project", `Are you sure you want to delete project '${projName}'?`, async () => {
            closeModal();
            try {
                const res = await fetch(`/api/planning/projects/${projId}`, {
                    method: 'DELETE'
                });
                const data = await res.json();
                if (data.success) {
                    const remaining = projects.filter(p => p.id !== projId);
                    setProjects(remaining);
                    if (remaining.length > 0) {
                        if (activeProjectId === projId) {
                            loadProjectData(remaining[0]);
                        }
                    } else {
                        handleCreateProject("Default Project");
                    }
                    setStatus({ type: 'success', text: `Project deleted.` });
                }
            } catch (e) {
                setStatus({ type: 'error', text: `Failed to delete project: ${e.message}` });
            }
        });
    };

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
                    setStatus({ type: 'success', text: `Folder added: ${newDir}, auto-indexing...` });
                    
                    // Trigger auto-index
                    handleIndexAll(newDirs);
                } else {
                    setStatus({ type: 'error', text: 'Folder already in project list.' });
                }
            } else if (data.error) {
                setStatus({ type: 'error', text: data.error });
            }
        } catch (err) {
            setStatus({ type: 'error', text: `Failed to pick folder: ${err.message}` });
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
                setStatus({ type: 'success', text: `Successfully detected tech stack: ${data.tech_stack}` });
                setTimeout(() => setStatus(null), 3000);
            } else {
                setStatus({ type: 'error', text: data.error || 'Failed to detect stack.' });
            }
        } catch (err) {
            setStatus({ type: 'error', text: `Stack detection error: ${err.message}` });
        } finally {
            setIsDetectingTech(false);
        }
    };

    const handleIndexAll = async (overrideDirs = null) => {
        const dirsToIndex = Array.isArray(overrideDirs) ? overrideDirs : targetDirs;
        if (dirsToIndex.length === 0) {
            setStatus({ type: 'error', text: 'Please add a project folder first.' });
            return;
        }
        setIsIndexing(true);
        setIndexProgress({ progress: 0, message: "Starting...", current_file: 0, total_files: 0 });
        setStatus(null);
        try {
            const res = await fetch('/api/planning/index-codebase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_dirs: dirsToIndex })
            });
            const data = await res.json();
            if (!data.success) {
                setStatus({ type: 'error', text: data.error || 'Failed to start indexing.' });
                setIsIndexing(false);
                setIndexProgress(null);
            }
        } catch (err) {
            setStatus({ type: 'error', text: `Indexing start error: ${err.message}` });
            setIsIndexing(false);
            setIndexProgress(null);
        }
    };

    const handleCancelIndex = async () => {
        try {
            await fetch('/api/planning/index-cancel', { method: 'POST' });
        } catch (e) {}
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
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep the last incomplete line in the buffer
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('data: ')) {
                        const dataStr = trimmedLine.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') continue;
                        try {
                            const dataObj = JSON.parse(dataStr);
                            
                            if (dataObj.choices && dataObj.choices[0]?.delta?.content) {
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
                    text: `Plan saved to: ${data.filepath}`
                });
            } else {
                setStatus({ type: 'error', text: data.error || 'Failed to save plan file.' });
            }
        } catch (err) {
            setStatus({ type: 'error', text: `Failed to save: ${err.message}` });
        } finally {
            setSavingIndex(null);
        }
    };

    const handleCopy = (content) => {
        navigator.clipboard.writeText(content);
        setStatus({ type: 'success', text: 'Copied to clipboard!' });
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
        openConfirm("Reset Chat", "Are you sure you want to clear the entire planning chat?", () => {
            setMessages([]);
            setStatus(null);
            closeModal();
        });
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
            <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-transparent shrink-0">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.0" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                    </svg>
                    <h2 className="text-sm font-bold text-white tracking-wider uppercase">AI Code Planner Chat</h2>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-neutral-300 font-bold bg-neutral-800 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {targetDirs.length} Project Folder
                    </span>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left Config Sidebar: Folders List & Settings */}
                <div className="w-[320px] border-r border-neutral-800 bg-[#0a0a0a] p-5 flex flex-col overflow-y-auto custom-scrollbar shrink-0 gap-6">
                    
                    {/* Active Project Selector */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Workspace Project</label>
                            <button
                                type="button"
                                onClick={() => handleCreateProject()}
                                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-800 rounded-lg text-[10px] font-bold text-white transition-all"
                            >
                                + New
                            </button>
                        </div>
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                            {projects.map(p => (
                                <div 
                                    key={p.id} 
                                    onClick={() => handleSelectProject(p.id)}
                                    className={`flex items-center justify-between border rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer transition-all ${
                                        activeProjectId === p.id 
                                            ? 'bg-neutral-800 border-neutral-600 text-white shadow-sm shadow-black/20' 
                                            : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-white/20 hover:text-neutral-300'
                                    }`}
                                >
                                    <span className="truncate flex-1" title={p.name}>
                                        {p.name}
                                    </span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }} 
                                        disabled={projects.length <= 1}
                                        className="ml-2 text-neutral-600 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Delete Project"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Project Folders Manager */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Projects / Folders</label>
                            <button
                                type="button"
                                onClick={handleAddFolder}
                                disabled={isPickingDir}
                                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-800 rounded-lg text-[10px] font-bold text-white transition-all"
                            >
                                {isPickingDir ? "..." : "+ Add"}
                            </button>
                        </div>
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                            {targetDirs.length === 0 ? (
                                <p className="text-[10px] text-neutral-500 italic">No folders added. Click "+ Add".</p>
                            ) : (
                                targetDirs.map((dir, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 font-mono">
                                        <span className="truncate flex-1" title={dir}>
                                            {dir === "." ? "./ (Project Root)" : dir}
                                        </span>
                                        <button 
                                            onClick={() => handleRemoveFolder(idx)} 
                                            className="ml-2 text-neutral-600 hover:text-white transition-colors"
                                            title="Remove Folder"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {isIndexing && indexProgress ? (
                            <div className="mt-3 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider">Indexing...</span>
                                    <span className="text-[10px] text-neutral-400">{indexProgress.current_file} / {indexProgress.total_files} files</span>
                                </div>
                                <div className="w-full bg-neutral-800 rounded-full h-1.5 mb-2 overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                        style={{ width: `${indexProgress.progress}%` }}
                                    ></div>
                                </div>
                                <div className="text-[10px] text-neutral-500 truncate mb-3" title={indexProgress.message}>
                                    {indexProgress.message}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCancelIndex}
                                    className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg py-1.5 px-3 text-xs font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <div className="mt-3">
                                {syncStatus && (
                                    <div className={`text-[10px] font-bold mb-2 flex items-center gap-1.5 ${syncStatus.is_synced ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {syncStatus.is_synced ? (
                                            <>
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                                Synced ({syncStatus.indexed} files)
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                Out of sync ({syncStatus.indexed} / {syncStatus.total} files)
                                            </>
                                        )}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={handleIndexAll}
                                    disabled={targetDirs.length === 0}
                                    className={`w-full bg-neutral-800 hover:bg-neutral-700 text-white border border-white/10 rounded-xl py-2 px-3 text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${syncStatus && !syncStatus.is_synced ? 'ring-1 ring-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-100 border-amber-500/20' : ''}`}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17.5M8 5h8M8 19h8"></path>
                                    </svg>
                                    {syncStatus && !syncStatus.is_synced ? 'Resync & Index' : 'Index Codebase'}
                                </button>
                            </div>
                        )}
                    </div>


                    {/* Clear Chat Button */}
                    <div className="mt-auto pt-4 border-t border-neutral-800">
                        <button
                            type="button"
                            onClick={handleClearChat}
                            className="w-full bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-400 hover:text-white text-xs font-semibold py-2.5 rounded-xl transition-all"
                        >
                            Clear Chat
                        </button>
                    </div>

                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#000000] relative">
                    
                    {/* Status Alerts Alert Banner */}
                    {status && (
                        <div className={`p-4 mx-6 mt-6 rounded-xl flex items-center gap-3 border text-sm font-medium shrink-0 z-20 ${
                            status.type === 'success' 
                                ? 'bg-neutral-800 border-neutral-600 text-white animate-fade-in' 
                                : 'bg-red-950 border-red-800 text-red-200 animate-fade-in'
                        }`}>
                            <span>{status.text}</span>
                            <button className="ml-auto text-xs opacity-60 hover:opacity-100" onClick={() => setStatus(null)}>✕</button>
                        </div>
                    )}

                    {/* Message list */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar select-text">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto p-6">
                                <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center text-white mb-5 shadow-lg">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-white mb-2">Welcome to Code Planner Chat</h3>
                                <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                                    Describe the changes or features you want to add to the codebase. The AI will automatically search for relevant code snippets from your indexed projects and formulate a Markdown implementation plan.
                                </p>
                                
                                {/* Quick Replies templates */}
                                <div className="grid grid-cols-1 gap-2.5 w-full">
                                    <button 
                                        onClick={(e) => handleSendMessage(e, "Create an implementation plan for a Dark Mode / Light Mode toggle feature.")}
                                        className="text-left bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-white/20 rounded-xl p-3.5 text-xs text-neutral-300 transition-all font-semibold"
                                    >
                                        💡 "Create an implementation plan for a Dark Mode / Light Mode toggle feature."
                                    </button>
                                    <button 
                                        onClick={(e) => handleSendMessage(e, "Write unit tests for the existing Python backend router.")}
                                        className="text-left bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-white/20 rounded-xl p-3.5 text-xs text-neutral-300 transition-all font-semibold"
                                    >
                                        🛠️ "Write unit tests for the existing Python backend router."
                                    </button>
                                    <button 
                                        onClick={(e) => handleSendMessage(e, "Explain the main file/component structure in this project.")}
                                        className="text-left bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-white/20 rounded-xl p-3.5 text-xs text-neutral-300 transition-all font-semibold"
                                    >
                                        📁 "Explain the main file/component structure in this project."
                                    </button>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                                        msg.role === 'user' 
                                            ? 'bg-neutral-800 border border-white/10 text-white' 
                                            : 'bg-transparent border border-neutral-800 text-neutral-300 prose prose-invert prose-chat max-w-none font-sans'
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
                                                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-800 shrink-0">
                                                        <button 
                                                            onClick={() => handleCopy(msg.content)}
                                                            className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-lg text-[10px] font-bold text-neutral-400 hover:text-white transition-colors"
                                                            title="Copy Markdown"
                                                        >
                                                            Copy
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDownload(msg.content)}
                                                            className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-lg text-[10px] font-bold text-neutral-400 hover:text-white transition-colors"
                                                            title="Download .md"
                                                        >
                                                            Download
                                                        </button>
                                                        <button 
                                                            onClick={() => handleSavePlan(idx, msg.content)}
                                                            disabled={savingIndex === idx}
                                                            className="ml-auto px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                                                            title={`Save plan to: ${selectedSaveDir}/${filename}`}
                                                        >
                                                            {savingIndex === idx ? (
                                                                "Saving..."
                                                            ) : (
                                                                <>
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                                                                    </svg>
                                                                    Save Plan
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
                    <div className="p-6 bg-gradient-to-t from-black to-transparent shrink-0">
                        <form onSubmit={handleSendMessage} className="relative flex items-end gap-3 bg-neutral-900 border border-white/10 hover:border-white/20 focus-within:border-white/30 rounded-2xl p-2 transition-all">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                placeholder={isGenerating ? "AI is thinking..." : "Describe the new coding flow or goal you want to implement..."}
                                disabled={isGenerating}
                                rows={2}
                                className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none resize-none pl-3 pr-12 py-2.5 leading-relaxed custom-scrollbar"
                            />
                            
                            <button
                                type="submit"
                                disabled={isGenerating || !inputText.trim()}
                                className="absolute right-3.5 bottom-3.5 w-8 h-8 bg-white hover:bg-neutral-200 disabled:bg-neutral-800 rounded-xl text-black font-semibold transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <svg className="animate-spin h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4 text-black disabled:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                    </svg>
                                )}
                            </button>
                        </form>
                        
                        <div className="flex items-center justify-between text-[9px] text-neutral-500 mt-2 px-1 font-mono">
                            <span>Press <kbd className="bg-neutral-800 text-neutral-400 px-1 py-0.5 rounded">Enter</kbd> to send, <kbd className="bg-neutral-800 text-neutral-400 px-1 py-0.5 rounded">Shift+Enter</kbd> for new line</span>
                            <span>{targetDirs.length > 0 ? `Active: ${targetDirs.map(d => dirName(d)).join(", ")}` : "No active project"}</span>
                        </div>
                    </div>

                </div>

            </div>

            {/* Custom Modal Overlay */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-cyan-900/10">
                        <div className="p-5">
                            <h3 className="text-lg font-bold text-white mb-2">{modalConfig.title}</h3>
                            {modalConfig.type === 'confirm' && (
                                <p className="text-sm text-neutral-300 mb-6">{modalConfig.message}</p>
                            )}
                            {modalConfig.type === 'prompt' && (
                                <input
                                    type="text"
                                    value={modalConfig.inputValue}
                                    onChange={(e) => setModalConfig({ ...modalConfig, inputValue: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            modalConfig.onConfirm(modalConfig.inputValue);
                                        }
                                    }}
                                    autoFocus
                                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-8000 transition-colors font-mono mb-6"
                                />
                            )}
                            <div className="flex items-center justify-end gap-3">
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => modalConfig.onConfirm(modalConfig.type === 'prompt' ? modalConfig.inputValue : true)}
                                    className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-sm font-bold rounded-xl transition-all shadow-lg"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
