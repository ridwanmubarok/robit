import React, { useState, useCallback, useRef } from 'react';
import ConfirmModal from './ConfirmModal';
import { useQueryClient } from '@tanstack/react-query';

export default function KnowledgeBaseArea({ kbDocs, onDeleteKBDoc, onToggleKBDoc }) {
  const [uploadQueue, setUploadQueue] = useState([]);   // [{name, status, stage, message}]
  const [dragActive, setDragActive] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const fileInputRef = useRef(null);

  const queryClient = useQueryClient();
  const refreshDocs = () => queryClient.invalidateQueries(['kbDocs']);

  const processFile = async (file) => {
    const uid = `${file.name}-${Date.now()}`;

    setUploadQueue(q => [...q, { uid, name: file.name, progress: 0, status: 'uploading', message: 'Mengunggah file...' }]);

    const updateEntry = (update) =>
      setUploadQueue(q => q.map(e => e.uid === uid ? { ...e, ...update } : e));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('uid', uid);

    try {
      const res = await fetch('/api/rag/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) {
        updateEntry({ status: 'error', message: `❌ ${data.error}` });
        return;
      }
      
      // Start polling status
      const pollInterval = setInterval(async () => {
          try {
              const statusRes = await fetch(`/api/rag/upload-status?uid=${uid}`);
              const statusData = await statusRes.json();
              if (statusData.success && statusData.state) {
                  const s = statusData.state;
                  updateEntry({ progress: s.progress, status: s.status, message: s.stage_msg });
                  if (s.status === 'done' || s.status === 'error' || s.status === 'canceled') {
                      clearInterval(pollInterval);
                      if (s.status === 'done') refreshDocs();
                      setTimeout(() => {
                          setUploadQueue(q => q.filter(e => e.uid !== uid));
                      }, 4000);
                  }
              }
          } catch (e) {}
      }, 500);

    } catch (err) {
      updateEntry({ status: 'error', message: '❌ Koneksi gagal' });
      setTimeout(() => {
        setUploadQueue(q => q.filter(e => e.uid !== uid));
      }, 4000);
    }
  };

  const handleCancelFile = async (uid) => {
      try {
          await fetch('/api/rag/upload-cancel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid })
          });
      } catch (e) {}
  };

  const handleFiles = (files) => {
    Array.from(files).forEach(file => processFile(file));
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, []);

  const handleChange = (e) => {
    if (e.target.files.length > 0) handleFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <section id="rag-view" className="flex-1 flex h-full relative w-full overflow-hidden">
      {/* Embedded Active Knowledge Base Sidebar */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-neutral-800 flex flex-col h-full shrink-0 relative z-20">
        <div className="p-4 flex items-center justify-between border-b border-neutral-800 shrink-0">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Active Knowledge Base</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {kbDocs.map((doc) => (
            <div key={doc.filename} className={`bg-[#000000]/40 border border-[#171717] rounded-lg p-2.5 flex items-start gap-2.5 group ${!doc.active ? 'opacity-50' : ''}`}>
              <div className="mt-0.5">
                {doc.filename.endsWith('.pdf') ? (
                  <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 3v6h6" /></svg>
                ) : doc.filename.match(/\.(png|jpe?g|gif)$/i) ? (
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                ) : (
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-neutral-300 truncate" title={doc.filename}>
                  {doc.filename} {doc.active ? '' : '(Inactive)'}
                </div>
                <div className="text-[9px] text-neutral-500 mt-0.5">{doc.upload_time}</div>
              </div>
            </div>
          ))}
          {kbDocs.length === 0 && (
            <div className="text-xs text-neutral-600 text-center py-4 px-2">No documents indexed in RAG workspace.</div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full bg-transparent p-6 space-y-6 overflow-y-auto custom-scrollbar">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">RAG Knowledge Base</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Upload documents for ROBIT to use as a knowledge source.</p>
        </div>
        <div className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-xs text-white font-semibold flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white400 animate-pulse"></span>
          {kbDocs.filter(d => d.active).length} / {kbDocs.length} Active Documents
        </div>
      </div>

      {/* Upload zone + pipeline in one row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Multi-file Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center cursor-pointer group min-h-[200px] ${
            dragActive ? 'border-neutral-600 bg-white500/5 scale-[1.01]' : 'bg-[#0a0a0a]/60 border-[#262626] hover:border-neutral-8000 hover:bg-[#0a0a0a]/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt,.md,.json,.pdf,.csv,.py,.js,.ts"
            multiple
            onChange={handleChange}
          />
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all ${
            dragActive ? 'bg-white/20 text-white' : 'bg-[#171717]/60 text-neutral-400 group-hover:bg-white/10 group-hover:text-white'
          }`}>
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
          </div>
          <h4 className="text-sm font-bold text-neutral-200 group-hover:text-white transition-colors">
            {dragActive ? 'Drop files here' : 'Click or drag files to upload'}
          </h4>
          <p className="text-[11px] text-neutral-500 mt-1.5">
            Select multiple files at once — PDF, TXT, MD, JSON, CSV, code
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
            {['PDF', 'TXT', 'MD', 'JSON', 'CSV', 'PY', 'JS', 'TS'].map(ext => (
              <span key={ext} className="text-[10px] bg-[#171717]/60 border border-neutral-700/50 text-neutral-400 px-2 py-0.5 rounded font-mono">{ext}</span>
            ))}
          </div>
        </div>

        {/* Pipeline Ingestion Visualizer */}
        <div className="bg-[#0a0a0a]/40 border border-[#171717] rounded-2xl p-5 flex flex-col justify-between min-h-[200px]">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${uploadQueue.length > 0 ? 'bg-white400 animate-ping' : 'bg-indigo-400/50'}`}></span>
              Pipeline Ingestion & Vectorization
            </h3>
            <p className="text-[11px] text-neutral-500 mb-4">
              {uploadQueue.length > 0 ? `Processing ${uploadQueue.length} files...` : 'Waiting for files...'}
            </p>
          </div>

          {/* Upload Queue */}
          {uploadQueue.length > 0 ? (
            <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto max-h-36 custom-scrollbar pr-1">
              {uploadQueue.map(entry => (
                <div key={entry.uid} className="bg-[#0a0a0a] border border-[#171717] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-neutral-300 truncate max-w-[60%]">{entry.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${
                        entry.status === 'done' ? 'text-emerald-400' :
                        entry.status === 'error' ? 'text-rose-400' : 'text-white'
                      }`}>{entry.message}</span>
                      {entry.status === 'uploading' && (
                        <button 
                          onClick={() => handleCancelFile(entry.uid)}
                          className="text-[10px] text-rose-400/80 hover:text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-neutral-800 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-500 ${
                        entry.status === 'done' ? 'bg-emerald-500' :
                        entry.status === 'error' ? 'bg-rose-500' : 'bg-white500'
                      }`}
                      style={{ width: `${entry.progress || 5}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
              <div className="grid grid-cols-3 gap-2 w-full relative">
                <div className="absolute top-[18px] left-[18%] right-[18%] h-[2px] bg-neutral-800" />
                {['Text Ingestion', 'Chunk Split', 'Vector Embed'].map((label, i) => (
                  <div key={label} className="flex flex-col items-center text-center z-10 gap-2">
                    <div className="w-9 h-9 rounded-full border bg-[#171717] border-neutral-700 text-neutral-600 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                    <span className="text-[10px] text-neutral-600 font-bold">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-[#0a0a0a]/40 border border-[#171717] rounded-2xl overflow-hidden flex-1 flex flex-col">
        <div className="px-5 py-4 border-b border-[#171717] flex items-center justify-between shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">All Registered Documents</h3>
          <span className="text-[10px] text-neutral-500">Sinkronisasi otomatis dengan TurboVec DB</span>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-[#0a0a0a]/80 uppercase text-[10px] tracking-wider text-neutral-500 sticky top-0">
              <tr>
                <th className="px-6 py-3.5">File Name</th>
                <th className="px-6 py-3.5">Format</th>
                <th className="px-6 py-3.5">Upload</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171717]/40">
              {kbDocs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-neutral-500">
                      <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-sm">No documents yet. Upload files above.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                kbDocs.map(doc => {
                  const ext = doc.filename.split('.').pop().toUpperCase();
                  return (
                    <tr key={doc.filename} className="hover:bg-[#171717]/20 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-neutral-100 max-w-xs truncate" title={doc.filename}>
                        <div className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-white500/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {doc.filename}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-[#171717] px-2 py-1 rounded text-neutral-300 text-[10px] font-bold font-mono">{ext}</span>
                      </td>
                      <td className="px-6 py-4 text-neutral-500 text-[11px]">{doc.upload_time || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => onToggleKBDoc(doc.filename, !doc.active)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${doc.active ? 'bg-white500' : 'bg-neutral-600'}`}
                        >
                          <span
                            className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                            style={{ transform: doc.active ? 'translateX(18px)' : 'translateX(4px)' }}
                          />
                        </button>
                        <span className={`ml-2 text-[10px] font-bold ${doc.active ? 'text-white' : 'text-neutral-500'}`}>
                          {doc.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            title: 'Delete Document',
                            message: `Are you sure you want to delete "${doc.filename}" from the knowledge base?`,
                            onConfirm: () => { onDeleteKBDoc(doc.filename); setConfirmModal({ isOpen: false }); }
                          })}
                          className="text-xs text-neutral-500 hover:text-rose-400 font-semibold transition-colors group-hover:text-rose-400/60"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </section>
  );
}
