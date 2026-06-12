import React from 'react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Delete", cancelText = "Cancel" }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-scale-up">
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                    <p className="text-gray-400 text-sm">{message}</p>
                </div>
                <div className="p-4 bg-white/5 border-t border-neutral-800 flex items-center justify-end gap-3">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-colors shadow-lg"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
