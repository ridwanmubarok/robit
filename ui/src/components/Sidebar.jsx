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
        <aside className="w-72 bg-transparent border-r border-white/5 flex flex-col h-full shrink-0 relative z-20">
            {/* Header Menu Items */}
            <div className="p-4 space-y-1 shrink-0 border-b border-white/5">
                <button 
                    onClick={() => navigate('/chat')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'chat' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.05)]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    Immersive Chat
                </button>
                <button 
                    onClick={() => navigate('/rag')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'rag' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.05)]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    Local RAG Engine
                </button>
                <button 
                    onClick={() => navigate('/ocr')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'ocr' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.05)]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    AI OCR Extractor
                </button>
                <button 
                    onClick={() => navigate('/translate')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'translate' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.05)]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 11.37 7.363 16.554 3 19h1.5c3.08-1.74 5.92-4.14 8-7.5l2 4.5"></path></svg>
                    AI Translate
                </button>
                <button 
                    onClick={() => navigate('/planning')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === 'planning' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.05)]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    Coding Planning
                </button>
            </div>

            {/* Dynamic Content based on activeView */}
            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                {activeView === 'chat' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1 mb-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">History Sessions</span>
                            <button onClick={onNewSession} className="text-cyan-400 hover:text-cyan-300 transition-colors p-1 hover:bg-cyan-400/10 rounded" title="New Session">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                            </button>
                        </div>
                        <div className="space-y-1">
                            {Object.entries(sessions || {})
                              .sort(([, a], [, b]) => (b.updated_at || 0) - (a.updated_at || 0))
                              .map(([id, s]) => {
                                const isActive = id === activeSessionId;
                                return (
                                    <div key={id} className="group flex items-center relative">
                                        <button 
                                            onClick={() => onSelectSession(id)}
                                            className={`flex-1 text-left px-3 py-2 rounded-lg text-sm font-medium truncate transition-all ${isActive ? 'bg-[#1e293b] text-cyan-400' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]/50'}`}
                                        >
                                            {s.title || 'New Session'}
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteSession(id, s.title); }}
                                            className={`absolute right-2 p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 ${isActive ? 'opacity-100' : ''}`}
                                            title="Hapus Sesi"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                        </button>
                                    </div>
                                );
                            })}
                            {Object.values(sessions || {}).length === 0 && (
                                <div className="text-xs text-slate-600 text-center py-4 px-2">Belum ada riwayat. Klik + untuk mulai chat baru.</div>
                            )}
                        </div>
                    </div>
                )}

                {activeView === 'rag' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1 mb-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Knowledge Base</span>
                        </div>
                        <div className="space-y-2">
                            {kbDocs.map((doc) => (
                                <div key={doc.filename} className={`bg-[#111827] border border-[#1e293b] rounded-lg p-2.5 flex items-start gap-2.5 group ${!doc.active ? 'opacity-50' : ''}`}>
                                    <div className="mt-0.5">
                                        {doc.filename.endsWith('.pdf') ? (
                                            <svg className="w-4 h-4 text-rose-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>
                                        ) : doc.filename.match(/\.(png|jpe?g|gif)$/i) ? (
                                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        ) : (
                                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-medium text-slate-300 truncate" title={doc.filename}>
                                            {doc.filename} {doc.active ? '' : '(Inactive)'}
                                        </div>
                                        <div className="text-[9px] text-slate-500 mt-0.5">{doc.upload_time}</div>
                                    </div>
                                </div>
                            ))}
                            {kbDocs.length === 0 && (
                                <div className="text-xs text-slate-600 text-center py-4 px-2">No documents indexed in RAG workspace.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Menu Items */}
            <div className="p-4 border-t border-white/5 shrink-0 space-y-1">
                <button 
                    onClick={() => navigate('/whichllm')}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all group ${activeView === 'whichllm' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'}`}
                >
                    <div className="flex items-center gap-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
                        WhichLLM
                    </div>
                </button>
                <button 
                    onClick={() => navigate('/settings')}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all group ${activeView === 'settings' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'}`}
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
