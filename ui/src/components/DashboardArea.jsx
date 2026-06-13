import React, { useState, useEffect } from 'react';

export default function DashboardArea() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/system/dashboard-stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="dashboard-view" className="flex-1 flex flex-col h-full bg-transparent p-6 space-y-6 overflow-y-auto custom-scrollbar">
      <div className="w-full space-y-6 animate-fade-in">
        
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">System Overview</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Real-time statistics of your local ROBIT workspace.</p>
          </div>
        </div>

          {loading ? (
            <div className="flex items-center gap-3 text-neutral-400">
                <div className="w-5 h-5 border-2 border-neutral-600 border-t-white rounded-full animate-spin"></div>
                Loading statistics...
            </div>
          ) : stats ? (
            <div className="space-y-6">
                
                {/* SECTION: ROBIT SYSTEM METRICS */}
                <div>
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">ROBIT Intelligence Data</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Indexed Files */}
                      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-indigo-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-white mb-1">{stats.indexed_files.toLocaleString()}</h3>
                          <p className="text-sm text-neutral-500 font-medium">Total Indexed Files</p>
                        </div>
                      </div>

                      {/* Model Size */}
                      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-white mb-1">{stats.model_size}</h3>
                          <p className="text-sm text-neutral-500 font-medium">{stats.total_models} LLM Models Downloaded</p>
                        </div>
                      </div>

                      {/* Database Size */}
                      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-amber-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-white mb-1">{stats.db_size}</h3>
                          <p className="text-sm text-neutral-500 font-medium">Vector & SQLite DB Size</p>
                        </div>
                      </div>
                      
                      {/* Total Sessions */}
                      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-cyan-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-white mb-1">{stats.total_sessions}</h3>
                          <p className="text-sm text-neutral-500 font-medium">Chat Sessions Saved</p>
                        </div>
                      </div>
                    </div>
                </div>

                {/* SECTION: HARDWARE RESOURCES */}
                <div>
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4 mt-8">Hardware & Environment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* CPU Usage */}
                        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-neutral-400 font-semibold uppercase tracking-wider">CPU Processing</span>
                                <span className="text-xs font-mono text-fuchsia-400 font-bold">{stats.cpu_percent}%</span>
                            </div>
                            <div className="w-full bg-neutral-900 rounded-full h-2 mb-4 border border-neutral-800">
                                <div className="bg-gradient-to-r from-fuchsia-500 to-purple-500 h-2 rounded-full" style={{ width: `${stats.cpu_percent}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-neutral-500 font-medium mt-auto">
                                <span>{stats.cpu_cores} Physical Cores</span>
                                <span>{stats.cpu_threads} Threads</span>
                            </div>
                        </div>

                        {/* RAM Usage */}
                        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-neutral-400 font-semibold uppercase tracking-wider">RAM Usage</span>
                                <span className="text-xs font-mono text-rose-400 font-bold">{stats.ram_percent}%</span>
                            </div>
                            <div className="w-full bg-neutral-900 rounded-full h-2 mb-4 border border-neutral-800">
                                <div className="bg-gradient-to-r from-rose-500 to-orange-500 h-2 rounded-full" style={{ width: `${stats.ram_percent}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-neutral-500 font-medium mt-auto">
                                <span>{stats.ram_used_gb} GB Used</span>
                                <span>{stats.ram_total_gb} GB Total</span>
                            </div>
                        </div>

                        {/* DISK Space */}
                        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-neutral-400 font-semibold uppercase tracking-wider">Storage Capacity</span>
                                <span className="text-xs font-mono text-sky-400 font-bold">{stats.disk_percent}%</span>
                            </div>
                            <div className="w-full bg-neutral-900 rounded-full h-2 mb-4 border border-neutral-800">
                                <div className="bg-gradient-to-r from-sky-500 to-blue-500 h-2 rounded-full" style={{ width: `${stats.disk_percent}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-neutral-500 font-medium mt-auto">
                                <span>{stats.disk_used_gb} GB Used</span>
                                <span>{stats.disk_total_gb} GB Total</span>
                            </div>
                        </div>

                        {/* OS & ENV Info */}
                        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 shadow-lg md:col-span-3 flex flex-wrap gap-y-4 items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Operating System</p>
                                    <p className="text-sm text-white font-medium">{stats.os_info}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Python Engine</p>
                                    <p className="text-sm text-white font-medium">v{stats.python_ver}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">System Uptime</p>
                                    <p className="text-sm text-white font-medium">{stats.uptime}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
          ) : (
             <div className="text-red-400 p-4 border border-red-900 bg-red-950/20 rounded-xl">
               Failed to load system statistics.
             </div>
          )}

        </div>
    </section>
  );
}
