import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar({
    sessions,
    activeSessionId,
    onSelectSession,
    onNewSession,
    onDeleteSession,
    kbDocs = []
}) {
    const navigate = useNavigate();
    const location = useLocation();
    const activeView = location.pathname.substring(1) || 'chat';
    return (
        <aside className="w-72 bg-transparent border-r border-neutral-600 flex flex-col h-full shrink-0 relative z-20">
            {/* Header Menu Items */}
            <div className="p-4 space-y-1 shrink-0 border-b border-neutral-600">
                <button 
                    onClick={() => navigate('/dashboard')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'dashboard' ? 'bg-neutral-800 text-white border border-white/20 shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                    Overview
                </button>
                <button 
                    onClick={() => navigate('/chat')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'chat' ? 'bg-neutral-800 text-white border border-white/20 shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    Chat
                </button>
                <button 
                    onClick={() => navigate('/rag')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'rag' ? 'bg-neutral-800 text-white border border-white/20 shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    Local RAG Engine
                </button>
                <button 
                    onClick={() => navigate('/ocr')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'ocr' ? 'bg-neutral-800 text-white border border-white/20 shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    AI OCR Extractor
                </button>
                <button 
                    onClick={() => navigate('/qa')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'qa' ? 'bg-neutral-800 text-white border border-white/20 shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    QA Automation
                </button>
                <button 
                    onClick={() => navigate('/translate')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'translate' ? 'bg-neutral-800 text-white border border-white/20 shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 11.37 7.363 16.554 3 19h1.5c3.08-1.74 5.92-4.14 8-7.5l2 4.5"></path></svg>
                    AI Translate
                </button>
                <button 
                    onClick={() => navigate('/planning')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'planning' ? 'bg-neutral-800 text-white border border-white/20 shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    Coding Planning
                </button>
            </div>

            {/* Dynamic Content based on activeView */}
            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                {/* RAG Knowledge Base list has been moved to KnowledgeBaseArea.jsx */}
            </div>

            {/* Bottom Menu Items */}
            <div className="p-4 border-t border-neutral-600 shrink-0 space-y-1">
                <button 
                    onClick={() => navigate('/whichllm')}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all group ${activeView === 'whichllm' ? 'bg-neutral-800 text-white border border-white/20' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
                >
                    <div className="flex items-center gap-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
                        WhichLLM
                    </div>
                </button>
                <button 
                    onClick={() => navigate('/settings')}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all group ${activeView === 'settings' ? 'bg-neutral-800 text-white border border-white/20' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
                >
                    <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        Advanced Settings
                    </div>
                </button>
            </div>
        </aside>
    );
}
