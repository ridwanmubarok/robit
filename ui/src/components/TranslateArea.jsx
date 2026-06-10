import React, { useState } from 'react';

const sourceLanguages = [
  { code: 'Auto', name: 'Auto-Detect' },
  { code: 'English', name: 'English' },
  { code: 'Indonesian', name: 'Indonesian' },
  { code: 'Japanese', name: 'Japanese' },
  { code: 'Korean', name: 'Korean' },
  { code: 'Chinese', name: 'Chinese' },
  { code: 'Arabic', name: 'Arabic' },
  { code: 'French', name: 'French' },
  { code: 'Spanish', name: 'Spanish' },
  { code: 'German', name: 'German' },
];

const targetLanguages = [
  { code: 'Indonesian', name: 'Indonesian' },
  { code: 'English', name: 'English' },
  { code: 'Japanese', name: 'Japanese' },
  { code: 'Korean', name: 'Korean' },
  { code: 'Chinese', name: 'Chinese' },
  { code: 'Arabic', name: 'Arabic' },
  { code: 'French', name: 'French' },
  { code: 'Spanish', name: 'Spanish' },
  { code: 'German', name: 'German' },
];

export default function TranslateArea() {
    const [sourceText, setSourceText] = useState("");
    const [translatedText, setTranslatedText] = useState("");
    const [sourceLang, setSourceLang] = useState("Auto");
    const [targetLang, setTargetLang] = useState("Indonesian");
    const [isTranslating, setIsTranslating] = useState(false);
    const [replies, setReplies] = useState([]);
    const [copiedReplyIdx, setCopiedReplyIdx] = useState(null);
    const [copiedTrans, setCopiedTrans] = useState(false);
    const [error, setError] = useState("");

    const handleTranslate = async () => {
        if (!sourceText.trim()) return;
        setIsTranslating(true);
        setError("");
        setTranslatedText("");
        setReplies([]);
        
        try {
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: sourceText,
                    source_lang: sourceLang,
                    target_lang: targetLang
                })
            });
            const data = await res.json();
            if (data.success) {
                setTranslatedText(data.translation);
                setReplies(data.replies || []);
            } else {
                setError(data.error || "Gagal menerjemahkan teks.");
            }
        } catch(err) {
            setError("Gagal menghubungi server LLM.");
            console.error(err);
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSwap = () => {
        if (sourceLang === 'Auto') return;
        const temp = sourceLang;
        setSourceLang(targetLang);
        setTargetLang(temp);
        setSourceText(translatedText);
        setTranslatedText(sourceText);
    };

    const copyToClipboard = (text, type, index = null) => {
        navigator.clipboard.writeText(text);
        if (type === 'translation') {
            setCopiedTrans(true);
            setTimeout(() => setCopiedTrans(false), 2000);
        } else if (type === 'reply' && index !== null) {
            setCopiedReplyIdx(index);
            setTimeout(() => setCopiedReplyIdx(null), 2000);
        }
    };

    return (
        <section id="translate-view" className="flex-1 flex flex-col h-full bg-transparent overflow-y-auto custom-scrollbar p-6 space-y-6">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">AI Translate</h2>
                    <p className="text-xs text-slate-400">Terjemahkan pesan secara cerdas dan dapatkan saran balasan otomatis.</p>
                </div>
            </div>

            {/* Translation Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* SOURCE CARD */}
                <div className="bg-[#111827] border border-[#22304d]/50 rounded-2xl p-5 flex flex-col space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-[#1f2937]/50 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asal</span>
                        </div>
                        <select 
                            value={sourceLang}
                            onChange={(e) => setSourceLang(e.target.value)}
                            className="bg-[#1f2937] border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 px-3 py-1.5 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                        >
                            {sourceLanguages.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                    </div>

                    <textarea
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        placeholder="Ketik atau tempel teks di sini untuk diterjemahkan..."
                        rows="6"
                        className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none outline-none focus:outline-none custom-scrollbar leading-relaxed"
                    ></textarea>

                    <div className="flex items-center justify-between border-t border-[#1f2937]/50 pt-3 text-xs text-slate-500">
                        <span>{sourceText.length} karakter</span>
                        {sourceText && (
                            <button 
                                onClick={() => setSourceText("")} 
                                className="text-slate-400 hover:text-rose-400 font-semibold transition-colors"
                            >
                                Hapus
                            </button>
                        )}
                    </div>
                </div>

                {/* TARGET CARD */}
                <div className="bg-[#111827] border border-[#22304d]/50 rounded-2xl p-5 flex flex-col space-y-4 shadow-xl relative">
                    <div className="flex items-center justify-between border-b border-[#1f2937]/50 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tujuan</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {sourceLang !== 'Auto' && (
                                <button 
                                    onClick={handleSwap}
                                    className="p-1.5 rounded-lg bg-[#1f2937] hover:bg-[#2e3e56] text-slate-400 hover:text-white transition-all"
                                    title="Tukar Bahasa"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                                </button>
                            )}
                            <select 
                                value={targetLang}
                                onChange={(e) => setTargetLang(e.target.value)}
                                className="bg-[#1f2937] border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 px-3 py-1.5 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                            >
                                {targetLanguages.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[144px] text-sm text-slate-200 leading-relaxed overflow-y-auto custom-scrollbar select-text whitespace-pre-wrap">
                        {isTranslating ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 font-medium">
                                <svg className="animate-spin h-5 w-5 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Sedang menerjemahkan dengan LLM lokal...</span>
                            </div>
                        ) : error ? (
                            <div className="text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs font-semibold">
                                {error}
                            </div>
                        ) : translatedText ? (
                            translatedText
                        ) : (
                            <span className="text-slate-600 italic">Hasil terjemahan akan muncul di sini...</span>
                        )}
                    </div>

                    <div className="flex items-center justify-between border-t border-[#1f2937]/50 pt-3 text-xs">
                        <span className="text-slate-500">{translatedText ? `${translatedText.length} karakter` : ""}</span>
                        {translatedText && (
                            <button 
                                onClick={() => copyToClipboard(translatedText, 'translation')}
                                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1.5 transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-5 4h6m-6 4h6m-6 4h6"></path></svg>
                                {copiedTrans ? "Disalin!" : "Salin Hasil"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ACTION BUTTON */}
            <div className="flex justify-center shrink-0">
                <button
                    onClick={handleTranslate}
                    disabled={isTranslating || !sourceText.trim()}
                    className="bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 disabled:opacity-50 disabled:grayscale text-white px-8 py-3 rounded-2xl text-sm font-bold flex items-center gap-2.5 shadow-lg shadow-cyan-500/15 active:scale-[0.98] transition-all"
                >
                    {isTranslating ? "Menerjemahkan..." : "Terjemahkan Sekarang"}
                    <svg className={`w-4 h-4 ${isTranslating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                </button>
            </div>

            {/* RECOMMENDED REPLIES */}
            {(replies.length > 0 || isTranslating) && (
                <div className="bg-[#111827]/80 border border-[#22304d]/40 rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-[#1f2937]/50 pb-3">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Rekomendasi Balasan</h3>
                    </div>

                    {isTranslating ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="bg-[#1f2937]/30 border border-slate-800/80 rounded-xl p-4 h-24 animate-pulse flex flex-col justify-between">
                                    <div className="h-3.5 bg-slate-700/50 rounded w-5/6"></div>
                                    <div className="h-3 bg-slate-700/35 rounded w-1/2 mt-2"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {replies.map((reply, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => copyToClipboard(reply, 'reply', idx)}
                                    className="bg-[#1f2937]/40 hover:bg-[#202c3f]/80 border border-slate-800/80 hover:border-cyan-500/30 rounded-xl p-4 text-left transition-all relative group flex flex-col justify-between h-auto min-h-[96px] shadow-sm active:scale-[0.99]"
                                >
                                    <span className="text-xs text-slate-300 group-hover:text-slate-100 font-medium leading-relaxed select-text">{reply}</span>
                                    <div className="mt-4 flex items-center justify-between w-full">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-cyan-400 transition-colors">
                                            {copiedReplyIdx === idx ? "Disalin!" : "Klik untuk Salin"}
                                        </span>
                                        <svg className={`w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors ${copiedReplyIdx === idx ? 'text-cyan-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {copiedReplyIdx === idx ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                            )}
                                        </svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
