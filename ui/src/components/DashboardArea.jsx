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

              {/* RAM Usage */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-rose-500/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">{stats.ram_used_gb} GB</h3>
                  <p className="text-sm text-neutral-500 font-medium">RAM Used / {stats.ram_total_gb} GB Total</p>
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
