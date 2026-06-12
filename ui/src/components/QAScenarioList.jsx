import React, { useState, useEffect } from 'react';

import ConfirmModal from './ConfirmModal';
import EditScenarioModal from './EditScenarioModal';

export default function QAScenarioList({ project, activeScenario, onSelectScenario }) {
    const [scenarios, setScenarios] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newScenarioName, setNewScenarioName] = useState("");
    const [newScenarioDesc, setNewScenarioDesc] = useState("");
    const [scenarioToDelete, setScenarioToDelete] = useState(null);
    const [scenarioToEdit, setScenarioToEdit] = useState(null);

    useEffect(() => {
        if (project) fetchScenarios();
    }, [project]);

    const fetchScenarios = async () => {
        const res = await fetch(`/api/qa/projects/${project.id}/scenarios`);
        const data = await res.json();
        setScenarios(data || []);
    };

    const handleCreate = async () => {
        if (!newScenarioName.trim()) return;
        const newScen = {
            id: crypto.randomUUID(),
            project_id: project.id,
            name: newScenarioName,
            description: newScenarioDesc,
            status: "idle",
            messages: [],
            script_code: "",
            updated_at: Date.now()
        };
        await fetch('/api/qa/scenarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newScen)
        });
        setIsCreating(false);
        setNewScenarioName("");
        setNewScenarioDesc("");
        fetchScenarios();
    };

    const handleDelete = async () => {
        if (!scenarioToDelete) return;
        await fetch(`/api/qa/scenarios/${scenarioToDelete}`, { method: 'DELETE' });
        setScenarioToDelete(null);
        fetchScenarios();
        // If the active scenario was deleted, it won't clear from parent state automatically, 
        // but that's handled gracefully since it won't exist in the list anymore.
    };

    const handleEditSave = async (updatedScenario) => {
        await fetch('/api/qa/scenarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedScenario)
        });
        setScenarioToEdit(null);
        fetchScenarios();
        onSelectScenario(updatedScenario);
    };

    if (!project) return null;

    return (
        <>
            <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-neutral-800 w-64 overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-[#0d0d0d]">
                <h2 className="text-white font-bold text-sm tracking-wide truncate">{project.name} Scenarios</h2>
                <button 
                    onClick={() => setIsCreating(!isCreating)}
                    className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 p-1.5 rounded shrink-0"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {isCreating && (
                    <div className="bg-neutral-900 border border-emerald-500/50 p-3 rounded-xl mb-4">
                        <input 
                            autoFocus
                            value={newScenarioName}
                            onChange={e => setNewScenarioName(e.target.value)}
                            placeholder="Scenario Name..."
                            className="w-full bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-emerald-500"
                        />
                        <textarea 
                            value={newScenarioDesc}
                            onChange={e => setNewScenarioDesc(e.target.value)}
                            placeholder="Description (optional)..."
                            rows="2"
                            className="w-full bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-emerald-500 resize-none custom-scrollbar"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsCreating(false)} className="text-xs text-neutral-400 hover:text-white">Cancel</button>
                            <button onClick={handleCreate} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded">Save</button>
                        </div>
                    </div>
                )}

                {scenarios.map(scen => {
                    const displayScen = (activeScenario && activeScenario.id === scen.id) ? activeScenario : scen;
                    return (
                    <div 
                        key={displayScen.id}
                        onClick={() => onSelectScenario(displayScen)}
                        className={`group flex items-start justify-between p-3 border rounded-xl cursor-pointer transition-colors ${
                            displayScen.status === 'success' ? 'bg-emerald-900/30 hover:bg-emerald-900/50 border-emerald-500/50' :
                            displayScen.status === 'failed' ? 'bg-rose-900/30 hover:bg-rose-900/50 border-rose-500/50' :
                            'bg-neutral-900/50 hover:bg-emerald-900/20 border-transparent hover:border-emerald-500/30'
                        }`}
                    >
                        <div className="overflow-hidden flex-1 pr-2">
                            <div className="flex items-center gap-2">
                                <div className="text-white text-sm font-medium truncate">{displayScen.name}</div>
                                {displayScen.status === "success" && (
                                    <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                )}
                                {displayScen.status === "failed" && (
                                    <svg className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                )}
                                {displayScen.status === "running" && (
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
                                )}
                            </div>
                            {displayScen.description && (
                                <div className="text-neutral-500 text-[10px] line-clamp-2 mt-0.5 leading-tight">{displayScen.description}</div>
                            )}
                        </div>
                        <div className="flex gap-1 shrink-0 mt-0.5">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setScenarioToEdit(displayScen);
                                }}
                                className="text-neutral-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                title="Edit Scenario"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setScenarioToDelete(displayScen.id);
                                }}
                                className="text-neutral-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                title="Delete Scenario"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                )})}
            </div>
        </div>
        <ConfirmModal 
            isOpen={!!scenarioToDelete}
            title="Delete Scenario"
            message="Are you sure you want to delete this scenario?"
            onConfirm={handleDelete}
            onCancel={() => setScenarioToDelete(null)}
            confirmText="Delete"
            cancelText="Cancel"
        />
        {scenarioToEdit && (
            <EditScenarioModal 
                scenario={scenarioToEdit}
                onClose={() => setScenarioToEdit(null)}
                onSave={handleEditSave}
            />
        )}
        </>
    );
}
