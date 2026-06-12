import React, { useState } from 'react';

export default function ProjectSettingsModal({ project, onClose, onSave, onClearState }) {
    const [persistSession, setPersistSession] = useState(project.persist_session !== 0);

    const handleSave = () => {
        onSave({ ...project, persist_session: persistSession ? 1 : 0 });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Project Settings</h2>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white p-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="flex flex-col gap-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center mt-1">
                            <input 
                                type="checkbox" 
                                checked={persistSession}
                                onChange={(e) => setPersistSession(e.target.checked)}
                                className="sr-only"
                            />
                            <div className={`w-10 h-5 rounded-full transition-colors ${persistSession ? 'bg-emerald-500' : 'bg-neutral-700'}`}></div>
                            <div className={`absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform ${persistSession ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">Enable Session Persistence</div>
                            <div className="text-xs text-neutral-500 mt-1 leading-relaxed">Save browser cookies and local storage to database. Scenarios in this project will share the same login session.</div>
                        </div>
                    </label>

                    <div className="border-t border-neutral-800 pt-4 mt-2">
                        <div className="text-sm font-medium text-rose-400 mb-2">Danger Zone</div>
                        <p className="text-xs text-neutral-500 mb-3">Clear saved session from the database. Next time a scenario runs, it will open a completely fresh browser context.</p>
                        <button 
                            onClick={() => {
                                if (confirm("Are you sure you want to clear the session state for this project?")) {
                                    onClearState(project.id);
                                }
                            }}
                            className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 px-3 py-2 rounded-lg font-medium transition-colors"
                        >
                            Clear Saved Session
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-lg shadow-emerald-900/20">
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
