import React, { useState, useEffect } from 'react';

import ConfirmModal from './ConfirmModal';
import ProjectSettingsModal from './ProjectSettingsModal';

export default function QAProjectList({ onSelectProject, activeProject }) {
    const [projects, setProjects] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [newTargetUrl, setNewTargetUrl] = useState("https://");
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [settingsProject, setSettingsProject] = useState(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        const res = await fetch('/api/qa/projects');
        const data = await res.json();
        setProjects(data || []);
    };

    const handleCreate = async () => {
        if (!newProjectName.trim()) return;
        const newProj = {
            id: crypto.randomUUID(),
            name: newProjectName,
            target_url: newTargetUrl,
            updated_at: Date.now()
        };
        await fetch('/api/qa/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProj)
        });
        setIsCreating(false);
        setNewProjectName("");
        setNewTargetUrl("https://");
        fetchProjects();
    };

    const handleDelete = async () => {
        if (!projectToDelete) return;
        await fetch(`/api/qa/projects/${projectToDelete}`, { method: 'DELETE' });
        setProjectToDelete(null);
        fetchProjects();
    };

    const handleSaveSettings = async (updatedProject) => {
        await fetch('/api/qa/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProject)
        });
        setSettingsProject(null);
        fetchProjects();
        if (activeProject && activeProject.id === updatedProject.id) {
            onSelectProject(updatedProject);
        }
    };

    const handleClearState = async (projectId) => {
        await fetch(`/api/qa/projects/${projectId}/state`, { method: 'DELETE' });
        setSettingsProject(null);
        alert("Session state cleared successfully!");
    };

    return (
        <>
            <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-neutral-800 w-64 overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-[#0d0d0d]">
                <h2 className="text-white font-bold text-sm tracking-wide">QA Projects</h2>
                <button 
                    onClick={() => setIsCreating(!isCreating)}
                    className="text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 p-1.5 rounded"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {isCreating && (
                    <div className="bg-neutral-900 border border-indigo-500/50 p-3 rounded-xl mb-4">
                        <input 
                            autoFocus
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                            placeholder="Project Name..."
                            className="w-full bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-indigo-500"
                        />
                        <input 
                            value={newTargetUrl}
                            onChange={e => setNewTargetUrl(e.target.value)}
                            placeholder="Target URL..."
                            className="w-full bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-indigo-500"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsCreating(false)} className="text-xs text-neutral-400 hover:text-white">Cancel</button>
                            <button onClick={handleCreate} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded">Save</button>
                        </div>
                    </div>
                )}

                {projects.map(proj => (
                    <div 
                        key={proj.id}
                        onClick={() => onSelectProject(proj)}
                        className="group flex items-center justify-between p-3 bg-neutral-900/50 hover:bg-indigo-900/20 border border-transparent hover:border-indigo-500/30 rounded-xl cursor-pointer transition-colors"
                    >
                        <div className="overflow-hidden">
                            <div className="text-white text-sm font-semibold truncate">{proj.name}</div>
                            <div className="text-neutral-500 text-[10px] truncate">{proj.target_url}</div>
                        </div>
                        <div className="flex gap-1">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSettingsProject(proj);
                                }}
                                className="text-neutral-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                title="Project Settings"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setProjectToDelete(proj.id);
                                }}
                                className="text-neutral-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                title="Delete Project"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <ConfirmModal 
            isOpen={!!projectToDelete}
            title="Delete QA Project"
            message="Are you sure you want to delete this project and all its scenarios? This action cannot be undone."
            onConfirm={handleDelete}
            onCancel={() => setProjectToDelete(null)}
            confirmText="Delete"
            cancelText="Cancel"
        />
        {settingsProject && (
            <ProjectSettingsModal 
                project={settingsProject}
                onClose={() => setSettingsProject(null)}
                onSave={handleSaveSettings}
                onClearState={handleClearState}
            />
        )}
        </>
    );
}
