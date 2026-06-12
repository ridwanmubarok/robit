import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import KnowledgeBaseArea from './KnowledgeBaseArea';
import SettingsArea from './SettingsArea';
import WhichLLMArea from './WhichLLMArea';
import OCRArea from './OCRArea';
import TranslateArea from './TranslateArea';
import PlanningArea from './PlanningArea';
import QAArea from './QAArea';
import ConfirmModal from './ConfirmModal';
import DashboardArea from './DashboardArea';
import { useHistory, useSaveSession, useKbDocs, useToggleKBDoc, useDeleteKBDoc, useModels, useChangeModel } from '../hooks/useQueries';

const queryClient = new QueryClient();

export default function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <App />
      </Router>
    </QueryClientProvider>
  );
}

function App() {
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState("");
  const [streamingTps, setStreamingTps] = useState(0);
  const [toolStatus, setToolStatus] = useState("");
  const [chatMode, setChatMode] = useState("all");
  const [systemPersona, setSystemPersona] = useState("Anda adalah ROBIT, asisten AI riset dari Rogatekno Labs. Berikan jawaban yang akurat, teknis, dan langsung ke inti (to-the-point). Gunakan konteks dokumen yang diberikan secara maksimal. Hindari penjelasan bertele-tele.");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeArea, setActiveArea] = useState('chat');
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  useEffect(() => {
    fetch('/api/setup/status')
      .then(res => res.json())
      .then(data => {
        if (!data.is_setup) {
            window.location.href = '/setup';
        } else {
            setIsLoadingSetup(false);
            setIsFirstLaunch(false);
        }
      })
      .catch(() => {
        window.location.href = '/setup';
      });
  }, []);

  const { data: historyData } = useHistory();
  const historySessions = historyData?.sessions || {};
  const { mutate: saveSession } = useSaveSession();

  const { data: kbDocs = [] } = useKbDocs();
  const toggleKBDocMutation = useToggleKBDoc();
  const deleteKBDocMutation = useDeleteKBDoc();

  const { data: modelsData } = useModels();
  const modelsList = modelsData?.list || [];
  const activeModel = modelsData?.active || "";
  const changeModelMutation = useChangeModel();

  const generateSessionId = () => 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  // Auto-initialize active session once history loads from server
  useEffect(() => {
    if (!historyData) return; // still loading

    const sessions = historyData.sessions || {};
    const savedActiveId = historyData.active_session;

    // If server has a saved active session and it still exists, use it
    if (savedActiveId && sessions[savedActiveId]) {
      setActiveSessionId(savedActiveId);
      return;
    }

    // Otherwise pick the most recent session, or create a new one
    const ids = Object.keys(sessions);
    if (ids.length > 0) {
      const mostRecent = ids.sort((a, b) => sessions[b].updated_at - sessions[a].updated_at)[0];
      setActiveSessionId(mostRecent);
    } else {
      // No sessions at all — create a fresh one
      const id = generateSessionId();
      const newSessions = { [id]: { title: "New Session", updated_at: Date.now(), messages: [] } };
      saveSession({ activeId: id, sessions: newSessions });
      setActiveSessionId(id);
    }
  }, [historyData]);

  if (isLoadingSetup) {
    return (
      <div className="bg-[#000000] text-neutral-300 h-screen w-screen flex flex-col items-center justify-center font-sans">
          <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded bg-zinc-100 flex items-center justify-center shadow-lg">
                  <span className="font-mono font-bold text-[#000000] text-xl">r</span>
              </div>
              <div className="flex items-baseline space-x-2">
                  <span className="font-bold text-3xl tracking-tight text-zinc-100">robit</span>
              </div>
          </div>
          <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-neutral-600 border-t-white rounded-full animate-spin"></div>
              <span className="text-neutral-500 font-medium tracking-wide text-sm">Starting workspace...</span>
          </div>
      </div>
    );
  }

  const handleModelChange = (newModel) => {
      if(!newModel) return;
      changeModelMutation.mutate({ model: newModel });
  };

  const createNewSessionState = (currentSessions = historySessions) => {
    const id = generateSessionId();
    const newSession = { title: "New Session", updated_at: Date.now(), messages: [] };
    const newSessions = { ...currentSessions, [id]: newSession };
    saveSession({ activeId: id, sessions: newSessions });
    return id;
  };

  const handleNewSession = () => {
    if(isGenerating) return;
    setActiveSessionId(createNewSessionState());
  };

  const handleDeleteSession = (id) => {
    setConfirmModal({
        isOpen: true,
        title: "Delete Chat",
        message: "Are you sure you want to delete this chat? This action cannot be undone.",
        onConfirm: () => {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            executeDeleteSession(id);
        }
    });
  };

  const executeDeleteSession = (id) => {
    const newSessions = { ...historySessions };
    delete newSessions[id];
    
    let newActiveId = activeSessionId;
    if(id === activeSessionId) {
      const remaining = Object.keys(newSessions);
      if(remaining.length > 0) {
        newActiveId = remaining.sort((a,b) => newSessions[b].updated_at - newSessions[a].updated_at)[0];
      } else {
        newActiveId = generateSessionId();
        newSessions[newActiveId] = { title: "New Session", updated_at: Date.now(), messages: [] };
      }
    }
    
    setActiveSessionId(newActiveId);
    saveSession({ activeId: newActiveId, sessions: newSessions });
  };

  const requestDeleteSession = (id, title) => {
    setConfirmModal({
        isOpen: true,
        title: "Delete Session",
        message: `Are you sure you want to delete the session "${title || 'this'}"? This action cannot be undone.`,
        onConfirm: () => {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            executeDeleteSession(id);
        }
    });
  };

  const handleSendMessage = async (text, overrideMsgs = null, toolDepth = 0, accumulatedCitations = []) => {
    const isRecursive = toolDepth > 0 || overrideMsgs !== null;
    if ((isGenerating && !isRecursive) || (!text && !overrideMsgs)) return;

    // Retrieve the latest history sessions directly from the Query Cache to bypass React stale closures
    const latestHistory = queryClient.getQueryData(['history']);
    const sessions = latestHistory?.sessions || {};

    // Guard: no active session yet
    if (!activeSessionId) return;
    
    let currentSession = sessions[activeSessionId];
    if (!currentSession) {
      // Auto-create a session and retry
      const id = generateSessionId();
      const newSessions = { ...sessions, [id]: { title: 'New Session', updated_at: Date.now(), messages: [] } };
      saveSession({ activeId: id, sessions: newSessions });
      setActiveSessionId(id);
      setTimeout(() => handleSendMessage(text, overrideMsgs, toolDepth, accumulatedCitations), 200);
      return;
    }

    let msgs = overrideMsgs || [...(currentSession.messages || [])];
    
    if (text) {
      if (currentSession.title === "New Session") {
          let title = text.split(' ').slice(0, 4).join(' ');
          if(title.length > 20) title = title.substring(0,20) + '...';
          currentSession.title = title;
      }
      msgs.push({ role: "user", content: text });
    }
    
    const updatedSessions = { ...sessions, [activeSessionId]: { ...currentSession, messages: msgs, updated_at: Date.now() } };
    
    // Save to server before stream starts
    saveSession({ activeId: activeSessionId, sessions: updatedSessions });
    
    setIsGenerating(true);
    setStreamingMsg("");
    setStreamingTps(0);
    setToolStatus("");

    let tokenCount = 0;
    let startTime = null;
    let finalTpsVal = 0;
    let promptTokens = null;
    let completionTokens = null;

    try {
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: "system", content: systemPersona }, ...msgs],
          stream: true,
          temperature: 0.7,
          max_tokens: 4096,
          chat_mode: chatMode,
          stream_options: { include_usage: true }
        })
      });

      if (!response.ok) throw new Error("Failed to connect to engine");

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
              
              if (dataObj.usage) {
                promptTokens = dataObj.usage.prompt_tokens;
                completionTokens = dataObj.usage.completion_tokens;
              }
              
              if (dataObj.choices && dataObj.choices[0]?.delta?.content) {
                fullAIResponse += dataObj.choices[0].delta.content;
                setStreamingMsg(fullAIResponse);
                
                if (startTime === null) {
                  startTime = Date.now();
                } else {
                  tokenCount++;
                  const elapsed = (Date.now() - startTime) / 1000;
                  if (elapsed > 0) {
                    const currentTps = tokenCount / elapsed;
                    setStreamingTps(currentTps);
                    finalTpsVal = currentTps;
                  }
                }
              }
            } catch (e) {}
          }
        }
      }

      setStreamingTps(0);

      const finalStats = {
        tps: finalTpsVal > 0 ? finalTpsVal : null,
        prompt_tokens: promptTokens || Math.round(msgs.reduce((acc, m) => acc + (m.content ? m.content.length : 0), 0) / 4),
        completion_tokens: completionTokens || tokenCount
      };

      msgs.push({ 
        role: "assistant", 
        content: fullAIResponse,
        stats: finalStats,
        citations: accumulatedCitations.length > 0 ? [...accumulatedCitations] : undefined
      });
      
      // Get absolute latest history data to prevent overwriting parallel modifications
      const midHistory = queryClient.getQueryData(['history']);
      const midSessions = midHistory?.sessions || {};
      const actualCurrentSession = midSessions[activeSessionId] || currentSession;
      
      let finalCompletionsSessions = { ...midSessions, [activeSessionId]: { ...actualCurrentSession, messages: msgs, updated_at: Date.now() } };
      
      setStreamingMsg("");

      // Tool handling logic — process all tool calls in sequence
      const toolResults = [];

      // 1. ask_docs tool
      const docsRegex = /<ask_docs\s+query="([^"]+)"\s*\/>/g;
      let match;
      if (chatMode === 'all' || chatMode === 'rag') {
          while ((match = docsRegex.exec(fullAIResponse)) !== null) {
              const query = match[1];
              setToolStatus(`🔍 Mencari di Knowledge Base: "${query}"...`);
              try {
                  const res = await fetch('/api/rag/query', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ query, top_k: 3 })
                  });
                  const data = await res.json();
                  
                  // Extract document source filenames
                  if (data.results) {
                      const sourceRegex = /\[Source:\s*([^\]]+)\]/g;
                      let srcMatch;
                      while ((srcMatch = sourceRegex.exec(data.results)) !== null) {
                          const filename = srcMatch[1].trim();
                          if (!accumulatedCitations.includes(filename)) {
                              accumulatedCitations.push(filename);
                          }
                      }
                  }
                  
                  toolResults.push(`TOOL RESULT [ask_docs query="${query}"]:\n${data.results}`);
              } catch (e) {
                  toolResults.push(`TOOL RESULT [ask_docs query="${query}"]: Error - ${e.message}`);
              }
          }
      }

      // 2. scrape tool
      const scrapeRegex = /<scrape\s+url="([^"]+)"\s*\/>/g;
      if (chatMode === 'all' || chatMode === 'research') {
          while ((match = scrapeRegex.exec(fullAIResponse)) !== null) {
              const url = match[1];
              setToolStatus(`🌐 Scraping: ${url}...`);
              try {
                  const res = await fetch('/api/scrape', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url })
                  });
                  const data = await res.json();
                  if (data.success) {
                      toolResults.push(`TOOL RESULT [scrape url="${url}"]:\n${data.content}`);
                  } else {
                      toolResults.push(`TOOL RESULT [scrape url="${url}"]: Error - ${data.error}`);
                  }
              } catch (e) {
                  toolResults.push(`TOOL RESULT [scrape url="${url}"]: Error - ${e.message}`);
              }
          }
      }

      // 3. search tool
      const searchRegex = /<search\s+query="([^"]+)"\s*\/>/g;
      if (chatMode === 'all' || chatMode === 'research') {
          while ((match = searchRegex.exec(fullAIResponse)) !== null) {
              const query = match[1];
              setToolStatus(`🔎 Mencari internet: "${query}"...`);
              try {
                  const res = await fetch('/api/search', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ query })
                  });
                  const data = await res.json();
                  toolResults.push(`TOOL RESULT [search query="${query}"]:\n${data.results}`);
              } catch (e) {
                  toolResults.push(`TOOL RESULT [search query="${query}"]: Error - ${e.message}`);
              }
          }
      }

      if (toolResults.length > 0 && toolDepth < 4) {
          setToolStatus("");
          const combinedResult = toolResults.join('\n\n---\n\n');
          msgs.push({ role: "user", content: combinedResult });
          const uSessions = { ...midSessions, [activeSessionId]: { ...actualCurrentSession, messages: msgs, updated_at: Date.now() } };
          saveSession({ activeId: activeSessionId, sessions: uSessions });
          
          // Recursive call with depth counter to prevent infinite loop
          setTimeout(() => handleSendMessage(null, msgs, toolDepth + 1, accumulatedCitations), 100);
      } else {
          setIsGenerating(false);
          saveSession({ activeId: activeSessionId, sessions: finalCompletionsSessions });
      }
      
    } catch(err) {
      console.error(err);
      msgs.push({ role: "assistant", content: "⚠️ Error: Connection to Engine failed." });
      
      const latestHistoryErr = queryClient.getQueryData(['history']);
      const latestSessionsErr = latestHistoryErr?.sessions || {};
      const actualCurrentSessionErr = latestSessionsErr[activeSessionId] || currentSession;
      
      let errSessions = { ...latestSessionsErr, [activeSessionId]: { ...actualCurrentSessionErr, messages: msgs, updated_at: Date.now() } };
      saveSession({ activeId: activeSessionId, sessions: errSessions });
      setIsGenerating(false);
    }
  };

  const activeMessages = activeSessionId && historySessions[activeSessionId] 
    ? historySessions[activeSessionId].messages 
    : [];

  return (
    <div className="bg-[#000000] text-neutral-300 h-screen w-screen overflow-hidden flex flex-col relative font-sans">
      
      {/* SetupWizard has been moved to /setup */}

      {/* Global Confirm Modal — rendered at root so it appears above everything */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Model Loading Progress Overlay */}
      {isFirstLaunch === false && modelsData && !modelsData.is_ready && (
        <div className="absolute inset-0 z-50 bg-[#000000]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 fade-in">
          {/* Ambient Glow behind loader */}
          <div className="absolute w-[400px] h-[400px] bg-white/10 blur-[80px] rounded-full pointer-events-none z-0"></div>
          
          <div className="relative z-10 flex flex-col items-center max-w-lg w-full text-center">
            {/* Spinning & Pulsing Ring Loader */}
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 border-r-indigo-400 animate-spin"></div>
              <div className="absolute inset-2 rounded-full bg-[#000000] flex items-center justify-center">
                <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Memuat Model AI Lokal...</h2>
            
            <div className="bg-[#0a0a0a]/80 border border-[#262626]/50 px-4 py-2 rounded-xl mb-4 text-xs font-semibold text-white tracking-wide inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white400 animate-ping"></span>
              {modelsData.active ? modelsData.active.split(/[/\\]/).pop() : "Model GGUF"}
            </div>
            
            <p className="text-sm text-neutral-400 mb-6 font-medium">
              Status: <span className="text-indigo-300">{modelsData.status || "Inisialisasi engine..."}</span>
            </p>
            
            {/* Live Terminal Console Logs */}
            <div className="w-full bg-[#000000] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl text-left flex flex-col h-56">
              <div className="bg-[#0a0a0a]/60 px-4 py-2.5 border-b border-neutral-600/80 flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">Engine Console Logs</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white400 animate-pulse"></span>
                  <span className="text-[9px] text-white/80 font-bold tracking-wider uppercase font-mono">Real-time</span>
                </span>
              </div>
              <div className="p-4 font-mono text-[10px] text-neutral-400 space-y-1.5 overflow-y-auto select-text flex-1 custom-scrollbar leading-relaxed">
                {modelsData.logs && modelsData.logs.length > 0 ? (
                  modelsData.logs.map((log, idx) => (
                    <div key={idx} className="break-all whitespace-pre-wrap select-text">{log}</div>
                  ))
                ) : (
                  <div className="text-neutral-600 italic">Menunggu log sistem pertama...</div>
                )}
              </div>
            </div>
            
            <p className="text-[10px] text-neutral-500 mt-4 max-w-sm">
              Model GGUF sedang dimuat ke memori lokal (RAM/VRAM) Anda. Proses ini membutuhkan waktu 10-30 detik tergantung ukuran model.
            </p>
          </div>
        </div>
      )}



      <div className="w-full h-full flex flex-col relative z-10 bg-transparent">
      {/* TOP HEADER BAR */}
      <header className="h-16 border-b border-neutral-600 bg-transparent flex items-center justify-between px-6 z-20 shrink-0">
          <div className="flex items-center space-x-3">
              <div className="w-7 h-7 rounded bg-zinc-100 flex items-center justify-center shadow-lg">
                  <span className="font-mono font-bold text-[#000000] text-sm">r</span>
              </div>
              <div className="flex items-baseline space-x-2">
                  <span className="font-bold text-sm tracking-tight text-zinc-100">robit</span>
                  <span className="text-[9px] uppercase font-mono tracking-wider text-neutral-500">v0.0.1</span>
              </div>
          </div>

          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-full border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  <span className="text-xs text-neutral-300 font-medium">
                      {activeModel ? activeModel.split(/[/\\]/).pop().replace('.gguf', '') : 'Model Active'}
                  </span>
              </div>
          </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative bg-transparent">
        <Sidebar 
          sessions={historySessions} 
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewSession={handleNewSession}
          onDeleteSession={requestDeleteSession}
          activeModel={activeModel}
          onModelChange={handleModelChange}
          isChangingModel={changeModelMutation.isPending}
          kbDocs={kbDocs}
        />
        
        <main className="flex-1 flex overflow-hidden bg-transparent relative">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardArea />} />
             <Route path="/chat" element={
              <ChatArea 
                messages={activeMessages} 
                isGenerating={isGenerating} 
                onSend={handleSendMessage}
                streamingMsg={streamingMsg}
                toolStatus={toolStatus}
                chatMode={chatMode}
                setChatMode={setChatMode}
                streamingTps={streamingTps}
              />
            } />
            <Route path="/rag" element={
              <KnowledgeBaseArea 
                kbDocs={kbDocs}
                onDeleteKBDoc={(filename) => deleteKBDocMutation.mutate({ filename })}
                onToggleKBDoc={(filename, active) => toggleKBDocMutation.mutate({ filename, active })}
              />
            } />
            <Route path="/ocr" element={<OCRArea />} />
            <Route path="/translate" element={<TranslateArea />} />
            <Route path="/planning" element={<PlanningArea />} />
            <Route path="/qa" element={<QAArea />} />
            <Route path="/settings" element={<SettingsArea />} />
            <Route path="/whichllm" element={<WhichLLMArea />} />
          </Routes>
        </main>
      </div>
    </div>
    </div>
  );
}
