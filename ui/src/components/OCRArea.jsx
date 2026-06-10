import React, { useState } from 'react';

export default function OCRArea() {
    const [imagePreview, setImagePreview] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isFormatting, setIsFormatting] = useState(false);
    const [resultText, setResultText] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleFileProcess = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setErrorMessage("Harap unggah file gambar yang valid.");
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
        setErrorMessage("");
        setIsExtracting(true);
        setResultText("");

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/extract', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                setResultText(data.text);
            } else {
                setErrorMessage("Ekstraksi gagal: " + data.error);
            }
        } catch(err) {
            setErrorMessage("Koneksi gagal.");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileProcess(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFileProcess(e.target.files[0]);
        }
    };

    const handleCopy = () => {
        if (resultText) {
            navigator.clipboard.writeText(resultText);
        }
    };

    const handleFormatAI = async () => {
        if (!resultText) return;
        setIsFormatting(true);
        setErrorMessage("");
        
        try {
            const prompt = `Tolong rapihkan dan format teks hasil OCR berikut agar mudah dibaca, perbaiki kesalahan ejaan jika ada, susun menjadi paragraf atau list yang benar. Berikan HANYA hasil teks yang sudah dirapihkan, tanpa pengantar atau penutup:\n\n${resultText}`;
            
            setResultText(""); // Clear text to show streaming
            const response = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    stream: true,
                    temperature: 0.3,
                    max_tokens: 2048
                })
            });

            if (!response.ok) throw new Error("Gagal memformat teks dengan AI");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullFormattedText = "";
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep the last incomplete line in the buffer
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('data: ')) {
                        const dataStr = trimmedLine.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') continue;
                        try {
                            const dataObj = JSON.parse(dataStr);
                            if (dataObj.choices && dataObj.choices[0]?.delta?.content) {
                                fullFormattedText += dataObj.choices[0].delta.content;
                                setResultText(fullFormattedText);
                            }
                        } catch (e) {}
                    }
                }
            }
        } catch (err) {
            setErrorMessage("Koneksi LLM gagal: " + err.message);
        } finally {
            setIsFormatting(false);
        }
    };

    return (
        <section id="ocr-view" className="flex-1 flex flex-col h-full bg-transparent p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        AI OCR Extractor
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">Ekstraksi teks dari gambar struk, dokumen, atau tulisan tangan menggunakan AI Vision.</p>
                </div>
                {errorMessage && (
                    <div className="bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-lg text-xs text-rose-400 font-semibold">
                        {errorMessage}
                    </div>
                )}
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                {/* Panel Kiri: Upload & Preview Image */}
                <div className="bg-[#0a0a0a]/40 border border-[#171717] rounded-2xl flex flex-col overflow-hidden relative">
                    <div className="px-5 py-4 border-b border-[#171717] flex justify-between items-center bg-[#0a0a0a]/80 shrink-0">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Source Image</h3>
                        {imagePreview && (
                            <button onClick={() => { setImagePreview(null); setResultText(""); }} className="text-[10px] text-white hover:text-neutral-300 font-bold px-2 py-1 bg-white/10 rounded">
                                Ganti Gambar
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 p-4 relative flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KSI+PC9jaXJjbGU+Cjwvc3ZnPg==')]">
                        
                        {!imagePreview ? (
                            <div 
                                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={() => setDragActive(false)}
                                onDrop={handleDrop}
                                className={`w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative group ${dragActive ? 'border-neutral-600 bg-white500/5' : 'border-[#262626] hover:border-neutral-8000 bg-[#0a0a0a]/60'}`}
                            >
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleChange} />
                                <div className="w-16 h-16 rounded-2xl bg-[#171717]/60 flex items-center justify-center text-neutral-400 group-hover:text-white group-hover:bg-white/10 transition-all mb-4 shadow-lg">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                </div>
                                <h4 className="text-sm font-semibold text-neutral-200">Drag & Drop Gambar di sini</h4>
                                <p className="text-[11px] text-neutral-500 mt-2 text-center max-w-xs">AI akan memindai gambar dan mengubahnya menjadi teks yang bisa diedit. Dukung struk, KTP, dan tulisan tangan.</p>
                            </div>
                        ) : (
                            <div className="relative w-full h-full rounded-xl overflow-hidden border border-neutral-700 bg-black/50 flex items-center justify-center">
                                <img src={imagePreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                                {isExtracting && (
                                    <>
                                        <div className="absolute inset-0 bg-neutral-800 backdrop-blur-[2px]"></div>
                                        <div className="absolute inset-x-0 h-1 bg-white400 shadow-[0_0_15px_#22d3ee] laser-line"></div>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                            <svg className="animate-spin h-8 w-8 text-white mb-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            <span className="bg-[#0a0a0a]/80 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">Memproses OCR...</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel Kanan: Hasil Ekstraksi */}
                <div className="bg-[#0a0a0a]/40 border border-[#171717] rounded-2xl flex flex-col overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#171717] flex items-center justify-between bg-[#0a0a0a]/80 shrink-0">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Result Text</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleFormatAI}
                                disabled={!resultText || isExtracting || isFormatting}
                                className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-50 text-indigo-400 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors border border-indigo-500/30"
                            >
                                {isFormatting ? (
                                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                )}
                                Format AI
                            </button>
                            <button 
                                onClick={handleCopy}
                                disabled={!resultText}
                                className="flex items-center gap-1.5 bg-[#171717] hover:bg-neutral-800 disabled:opacity-50 text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors border border-neutral-700"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                Copy
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-4">
                        <textarea 
                            className="w-full h-full bg-[#0a0a0a]/80 border border-[#171717] rounded-xl p-4 text-sm text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-neutral-8000 resize-none custom-scrollbar leading-relaxed"
                            placeholder="Teks hasil scan akan muncul di sini dan bisa diedit..."
                            value={resultText}
                            onChange={(e) => setResultText(e.target.value)}
                            readOnly={isExtracting || isFormatting}
                        ></textarea>
                    </div>
                </div>
            </div>
        </section>
    );
}
