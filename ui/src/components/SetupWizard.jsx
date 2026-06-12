import React, { useState, useEffect, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [hardware, setHardware] = useState(null);
  const [serverLogs, setServerLogs] = useState('');
  const logsEndRef = useRef(null);
  
  // Download states
  const [engineState, setEngineState] = useState({ status: 'idle', progress: 0, text: '' });
  const [modelState, setModelState] = useState({ status: 'idle', progress: 0, downloadedMb: 0, totalMb: 0, text: '', error: '' });
  
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (step === 0) {
      const isTauri = window.__TAURI_INTERNALS__ || window.__TAURI__ || window.location.protocol.startsWith('tauri');
      let isChecking = false;

      const checkServer = () => {
        if (isChecking) return;
        isChecking = true;
        fetch('/api/setup/hardware')
          .then(res => res.json())
          .then(data => {
            if(data.success) {
              setHardware(data);
              setStep(1);
            }
          })
          .catch(err => {
            if (isTauri) {
               invoke('read_backend_log')
                 .then(logs => setServerLogs(logs))
                 .catch(() => {});
            }
          })
          .finally(() => {
            isChecking = false;
          });
      };
      checkServer();
      const interval = setInterval(checkServer, 2000);
      return () => clearInterval(interval);
    }
  }, [step]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [serverLogs]);

  useEffect(() => {
    // Global poll for downloads/imports
    const interval = setInterval(() => {
      fetch('/api/setup/download-status')
        .then(res => res.json())
        .then(data => {
          if (data.engine) {
            setEngineState({
              status: data.engine.status,
              progress: data.engine.progress,
              text: data.engine.status === 'extracting' ? 'Extracting ZIP...' : 
                    data.engine.status === 'downloading' ? `${data.engine.downloaded_mb} / ${data.engine.total_mb} MB` : ''
            });
          }
          if (data.model) {
            setModelState({
              status: data.model.status,
              progress: data.model.progress || 0,
              downloadedMb: data.model.downloaded_mb || 0,
              totalMb: data.model.total_mb || 0,
              text: data.model.status === 'downloading' ? `Copying... ${data.model.downloaded_mb || 0} / ${data.model.total_mb || 0} MB` : '',
              error: data.model.error || ''
            });
            // Auto-redirect when done
            if (data.model.status === 'done') {
              setTimeout(() => { window.location.href = '/'; }, 1500);
            }
          }
        })
        .catch(() => {});
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const downloadEngine = () => {
    setEngineState(prev => ({ ...prev, status: 'downloading' }));
    fetch('/api/setup/download-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engine_type: hardware?.recommendedEngine || "Vulkan" })
    });
  };

  const handleSelectFile = async () => {
    try {
      const file = await open({
        multiple: false,
        filters: [{
          name: 'GGUF Model',
          extensions: ['gguf']
        }]
      });
      if (file) {
        setSelectedFile(file);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const importModel = () => {
    if (!selectedFile) return;
    setModelState(prev => ({ ...prev, status: 'downloading' }));
    fetch('/api/setup/import-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_path: selectedFile })
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#000000] flex flex-col items-center justify-center p-6 text-neutral-300 font-sans">
      <div className="max-w-2xl w-full bg-[#0a0a0a] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-8">
        
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center mb-6">
              <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded bg-zinc-100 flex items-center justify-center shadow-lg">
                      <span className="font-mono font-bold text-[#000000] text-xl">r</span>
                  </div>
                  <div className="flex items-baseline space-x-2">
                      <span className="font-bold text-3xl tracking-tight text-zinc-100">robit</span>
                      <span className="text-[12px] uppercase font-mono tracking-wider text-neutral-500">v0.0.1</span>
                  </div>
              </div>
              <p className="text-neutral-500">Your privacy-first local AI workspace. Let's set up your environment.</p>
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">Backend Initialization</h2>
            <div className="flex items-center gap-3 text-neutral-400">
              <div className="w-5 h-5 border-2 border-neutral-600 border-t-white rounded-full animate-spin"></div>
              Waiting for local server to be ready...
            </div>
            
            <div className="mt-4 bg-[#050505] border border-neutral-800 rounded-xl overflow-hidden shadow-inner">
              <div className="bg-neutral-900 px-4 py-2 border-b border-neutral-800 text-xs font-mono text-neutral-500 uppercase tracking-wider flex justify-between">
                <span>Server Logs</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> polling</span>
              </div>
              <div className="p-4 h-48 overflow-y-auto font-mono text-[10px] text-green-400 whitespace-pre-wrap leading-relaxed">
                {serverLogs || "Waiting for logs..."}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">Hardware Detection</h2>
            {hardware && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between"><span className="text-neutral-500">OS:</span> <span className="font-mono text-white">{hardware.os}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">RAM:</span> <span className="font-mono text-white">{hardware.ram}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">GPU:</span> <span className="font-mono text-white">{hardware.gpu}</span></div>
                <div className="mt-4 p-3 bg-[#111111] rounded-lg border border-neutral-700">
                  <p className="text-sm">Based on your hardware, we recommend the <strong>{hardware.recommendedEngine}</strong> engine.</p>
                </div>
              </div>
            )}
            
            <button 
              disabled={!hardware}
              onClick={() => setStep(2)}
              className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">Download AI Engine</h2>
            <p className="text-sm text-neutral-400">ROBIT will download the optimized Llama.cpp engine for your system.</p>
            
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Llama.cpp ({hardware.recommendedEngine})</p>
                <p className="text-xs text-neutral-500">~30 MB</p>
              </div>
              {engineState.status === 'idle' && (
                <button onClick={downloadEngine} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-semibold transition-colors">Download</button>
              )}
              {(engineState.status === 'downloading' || engineState.status === 'extracting') && (
                <div className="w-1/2">
                  <div className="flex justify-between text-xs text-neutral-400 mb-2">
                    <span>{engineState.status === 'extracting' ? 'Extracting...' : 'Downloading...'}</span>
                    <span>{engineState.text}</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-white h-2.5 rounded-full transition-all duration-300" style={{width: `${engineState.progress || (engineState.status === 'extracting' ? 100 : 0)}%`}}></div>
                  </div>
                </div>
              )}
              {engineState.status === 'done' && (
                <span className="text-green-500 font-bold flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  Ready
                </span>
              )}
              {engineState.status === 'error' && (
                <div className="text-center p-3 text-red-400 font-bold bg-red-500/10 rounded-xl border border-red-500/20 flex flex-col items-center">
                  <span>Download Failed</span>
                  {engineState.error && <span className="text-xs mt-1 font-normal opacity-80">{engineState.error}</span>}
                </div>
              )}
            </div>

            <button 
              disabled={engineState.status !== 'done'}
              onClick={() => setStep(3)}
              className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 mt-4"
            >
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">Import Local Model</h2>
            <p className="text-sm text-neutral-400">Please select a `.gguf` model that you have already downloaded to your computer.</p>
            
            <div className="p-6 border border-dashed border-neutral-700 rounded-xl bg-neutral-900/50 flex flex-col items-center justify-center text-center">
               <svg className="w-12 h-12 text-neutral-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
               {selectedFile ? (
                 <p className="text-white font-mono text-sm break-all mb-4">{selectedFile}</p>
               ) : (
                 <p className="text-neutral-500 text-sm mb-4">No file selected.</p>
               )}
               
               {modelState.status === 'idle' && (
                 <button onClick={handleSelectFile} className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-lg transition-colors border border-neutral-700">
                   Browse .gguf File
                 </button>
               )}
            </div>

            <div className="flex items-center justify-between pt-4">
              {modelState.status === 'idle' && (
                <button 
                  disabled={!selectedFile}
                  onClick={importModel} 
                  className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Import Model
                </button>
              )}
              {modelState.status === 'downloading' && (
                <div className="w-full text-center p-3">
                  <div className="flex justify-between text-xs text-neutral-400 mb-2">
                    <span>Copying file to workspace...</span>
                    <span>{modelState.downloadedMb} / {modelState.totalMb} MB</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-white h-2.5 rounded-full transition-all duration-300"
                      style={{width: `${modelState.progress || 0}%`}}
                    ></div>
                  </div>
                </div>
              )}
              {modelState.status === 'done' && (
                <div className="w-full text-center p-3 bg-green-900/20 border border-green-800 rounded-xl">
                  <span className="text-green-500 font-bold flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    Model Imported! Launching workspace...
                  </span>
                </div>
              )}
            </div>

            <button 
              disabled={modelState.status !== 'done'}
              onClick={() => { window.location.href = '/'; }}
              className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 mt-2"
            >
              Launch ROBIT Workspace
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
