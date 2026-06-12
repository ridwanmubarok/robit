import React, { useState } from 'react';

export default function EditScenarioModal({ scenario, onClose, onSave }) {
    const [name, setName] = useState(scenario.name);
    const [description, setDescription] = useState(scenario.description || "");

    const handleSave = () => {
        onSave({ ...scenario, name, description });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-white">Edit Scenario</h2>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white p-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Scenario Name</label>
                    <input 
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Login with valid credentials"
                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Description (Optional)</label>
                    <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Detailed explanation of what this scenario tests..."
                        rows="3"
                        className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none custom-scrollbar"
                    />
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={!name.trim()} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors shadow-lg shadow-emerald-900/20">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
