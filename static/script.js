const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const systemPersona = document.getElementById('system-persona');
const fileInput = document.getElementById('file-input');
const attachBtn = document.getElementById('attach-btn');
const contextContainer = document.getElementById('context-container');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const saveSettings = document.getElementById('save-settings');

let activeContexts = [];
const statusDot = document.getElementById('status-dot');
const serverStatus = document.getElementById('server-status');
const engineLogs = document.getElementById('engine-logs');

let messageHistory = [];
let isGenerating = false; // New flag to optimize performance

function getSystemMessage() {
    return { 
        role: "system", 
        content: systemPersona.value.trim() || "You are ROBIT, a helpful local AI assistant."
    };
}

const renderer = new marked.Renderer();

renderer.code = function(token) {
    let code, lang;
    if (typeof token === 'object' && token !== null && 'text' in token) {
        code = token.text;
        lang = token.lang;
    } else {
        code = token;
        lang = arguments[1];
    }

    const language = (lang && lang.trim()) ? lang.trim().toLowerCase() : null;
    const isPreviewable = ['html', 'htm', 'svg'].includes(language);
    const displayLabel = language ? language.toUpperCase() : 'CODE';

    let highlighted;
    try {
        if (language && hljs.getLanguage(language)) {
            highlighted = hljs.highlight(code, { language }).value;
        } else {
            const result = hljs.highlightAuto(code);
            highlighted = result.value;
        }
    } catch (e) {
        highlighted = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    const tabsHtml = isPreviewable ? `
        <div class="flex items-center gap-1 ml-4 bg-white/5 p-1 rounded-lg">
            <button class="preview-tab-btn active" onclick="switchTab(this, 'code')">Code</button>
            <button class="preview-tab-btn" onclick="switchTab(this, 'preview')">Preview</button>
        </div>
    ` : '';

    return `
        <div class="code-container">
            <div class="code-header">
                <div class="flex items-center">
                    <span class="flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"></path><path d="m6 8-4 4 4 4"></path><path d="m14.5 4-5 16"></path></svg>
                        ${displayLabel}
                    </span>
                    ${tabsHtml}
                </div>
                <button class="copy-btn" onclick="copyCode(this)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                    <span>Copy</span>
                </button>
            </div>
            <div class="code-content-wrapper">
                <pre class="code-view"><code class="hljs language-${language || 'plaintext'}">${highlighted}</code></pre>
                ${isPreviewable ? `
                <div class="preview-container">
                    <iframe class="preview-iframe" sandbox="allow-scripts"></iframe>
                </div>
                ` : ''}
            </div>
        </div>
    `;
};

marked.setOptions({ renderer, breaks: true });


window.copyCode = async (btn) => {
    const container = btn.closest('.code-container');
    const code = container.querySelector('code').innerText;
    
    try {
        await navigator.clipboard.writeText(code);
        
        const span = btn.querySelector('span');
        const originalText = span.innerText;
        span.innerText = "Copied!";
        btn.classList.add('text-green-400');
        
        setTimeout(() => {
            span.innerText = originalText;
            btn.classList.remove('text-green-400');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
};

window.switchTab = (btn, tab) => {
    const container = btn.closest('.code-container');
    const codeView = container.querySelector('.code-view');
    const previewContainer = container.querySelector('.preview-container');
    const iframe = container.querySelector('.preview-iframe');
    const btns = btn.parentElement.querySelectorAll('.preview-tab-btn');
    
    // Toggle buttons
    btns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (tab === 'preview') {
        // Fix: Use textContent because innerText is "" when hidden
        const rawCode = codeView.textContent;
        codeView.style.display = 'none';
        previewContainer.style.display = 'block';
        
        // Only update if changed to prevent blanking
        if (iframe.srcdoc !== rawCode) {
            iframe.srcdoc = rawCode;
        }
    } else {
        codeView.style.display = 'block';
        previewContainer.style.display = 'none';
    }
};

userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
});

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);

attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    attachBtn.disabled = true;
    attachBtn.innerHTML = `<svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`;

    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/extract', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (data.success) {
                addContextChip(data.filename, data.text);
            } else {
                alert(`Gagal membaca ${file.name}: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
            alert(`Error mengunggah ${file.name}`);
        }
    }

    fileInput.value = '';
    attachBtn.disabled = false;
    attachBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`;
});

function addContextChip(filename, text) {
    if (activeContexts.find(c => c.filename === filename)) return;

    activeContexts.push({ filename, text });
    
    const chip = document.createElement('div');
    chip.className = 'context-chip fade-in';
    chip.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        <span>${filename}</span>
        <button onclick="removeContext('${filename}', this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
        </button>
    `;
    contextContainer.appendChild(chip);
}

window.removeContext = (filename, btn) => {
    activeContexts = activeContexts.filter(c => c.filename !== filename);
    btn.parentElement.remove();
};

settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
});

closeSettings.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

saveSettings.addEventListener('click', () => {
    settingsModal.style.display = 'none';
    settingsBtn.classList.add('bg-emerald-500/20', 'text-emerald-400');
    setTimeout(() => {
        settingsBtn.classList.remove('bg-emerald-500/20', 'text-emerald-400');
    }, 1000);
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
});

newChatBtn.addEventListener('click', () => {
    chatMessages.innerHTML = `
        <div class="max-w-3xl mx-auto flex gap-4 fade-in">
            <div class="w-10 h-10 rounded-xl glass border border-white/5 flex items-center justify-center flex-shrink-0 text-indigo-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
            </div>
            <div class="space-y-3 pt-2 max-w-[calc(100%-3rem)]">
                <div class="text-gray-400 text-xs font-semibold uppercase tracking-widest px-1">Rogatekno Labs</div>
                <div class="prose prose-invert prose-p:leading-relaxed text-gray-300">
                    Hello! Let's start a new research session at Rogatekno Labs. What would you like to explore?
                </div>
            </div>
        </div>
    `;
    messageHistory = [];
    activeContexts = [];
    contextContainer.innerHTML = '';
});

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || userInput.disabled) return;

    if (messageHistory.length === 0) {
        messageHistory.push(getSystemMessage());
    }

    let finalPrompt = text;
    if (activeContexts.length > 0) {
        // High-instruction format for 1-bit models
        const contexts = activeContexts.map(c => `DOKUMEN [${c.filename}]:\n"""\n${c.text}\n"""`).join('\n\n');
        finalPrompt = `Gunakan DATA DOKUMEN di bawah ini untuk menjawab pertanyaan saya secara akurat.\n\n${contexts}\n\n--- PERTANYAAN USER ---\n${text}`;
    }

    appendMessageUI('user', text, [...activeContexts]);
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Clear context after sending to avoid duplicate context in next turn
    activeContexts = [];
    contextContainer.innerHTML = '';
    
    userInput.disabled = true;
    sendBtn.disabled = true;

    messageHistory.push({ role: "user", content: finalPrompt });

    const aiBubble = createAIPlaceholder();
    chatMessages.appendChild(aiBubble);
    const contentDiv = aiBubble.querySelector('.message-content');
    const perfDiv = aiBubble.querySelector('.message-perf');
    
    chatMessages.scrollTop = chatMessages.scrollHeight;

    isGenerating = true; // Stop polling while generating
    const startTime = performance.now();
    let firstTokenTime = null;
    let tokenCount = 0;

    try {
        const response = await fetch('/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: messageHistory,
                stream: true
            })
        });

        if (!response.ok) throw new Error('Failed to connect to the server. Ensure server.py is active.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullAIResponse = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    const dataStr = line.trim().slice(6);
                    if (dataStr === '[DONE]') continue;
                    
                    try {
                        const data = JSON.parse(dataStr);
                        const content = data.choices[0].delta.content || "";
                        
                        if (content) {
                            if (!firstTokenTime) firstTokenTime = performance.now();
                            fullAIResponse += content;
                            tokenCount++;
                            
                            // Render Markdown
                            contentDiv.innerHTML = marked.parse(fullAIResponse);
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (e) {}
                }
            }
        }
        
        messageHistory.push({ role: "assistant", content: fullAIResponse });

        // Agent Thought Loop Logic
        const toolsFound = await handleAgentTools(fullAIResponse);
        if (toolsFound) {
            return await sendMessage(); 
        }

        const endTime = performance.now();
        const duration = ((endTime - (firstTokenTime || startTime)) / 1000).toFixed(2);
        const tps = (tokenCount / (duration > 0 ? duration : 1)).toFixed(2);

        perfDiv.innerHTML = `
            <div class="perf-badge fade-in">
                <span>Time: <span class="perf-value">${duration}s</span></span>
                <span>Speed: <span class="perf-value text-indigo-400 font-bold">${tps} t/s</span></span>
            </div>
        `;
        
        contentDiv.classList.remove('message-stream');

    } catch (error) {
        console.error(error);
        contentDiv.innerHTML = `<span class="text-red-400">Error: ${error.message}</span>`;
    } finally {
        isGenerating = false; 
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

async function handleAgentTools(text) {
    let toolsFound = false;

    // LS Tool
    const lsMatches = [...text.matchAll(/<ls\s+path=["'](.*?)["']\s*\/>/g)];
    for (const m of lsMatches) {
        const path = m[1];
        appendToolStatusUI(`🔍 AGENT: Listing ${path}...`);
        try {
            const res = await fetch('/api/fs/ls', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({path}) 
            }).then(r => r.json());
            const result = res.success ? `Items in ${path}: ${res.items.join(', ')}` : `Error: ${res.error}`;
            messageHistory.push({ role: "user", content: `TOOL RESULT: ${result}` });
            toolsFound = true;
        } catch (e) { console.error(e); }
    }

    // READ Tool
    const readMatches = [...text.matchAll(/<read\s+path=["'](.*?)["']\s*\/>/g)];
    for (const m of readMatches) {
        const path = m[1];
        appendToolStatusUI(`📖 AGENT: Reading ${path}...`);
        try {
            const res = await fetch('/api/fs/read', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({path}) 
            }).then(r => r.json());
            const result = res.success ? `Content of ${path}:\n${res.content}` : `Error: ${res.error}`;
            messageHistory.push({ role: "user", content: `TOOL RESULT: ${result}` });
            toolsFound = true;
        } catch (e) { console.error(e); }
    }

    // WRITE Tool
    const writeMatches = [...text.matchAll(/<write\s+path=["'](.*?)["']>(.*?)<\/write>/gs)];
    for (const m of writeMatches) {
        const path = m[1];
        const content = m[2];
        appendToolStatusUI(`📝 AGENT: Writing to ${path}...`);
        try {
            const res = await fetch('/api/fs/write', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({path, content}) 
            }).then(r => r.json());
            const result = res.success ? `Success writing to ${path}` : `Error: ${res.error}`;
            messageHistory.push({ role: "user", content: `TOOL RESULT: ${result}` });
            toolsFound = true;
        } catch (e) { console.error(e); }
    }

    // SEARCH Tool
    const searchMatches = [...text.matchAll(/<search\s+query=["'](.*?)["']\s*\/>/g)];
    for (const m of searchMatches) {
        const query = m[1];
        appendToolStatusUI(`🌍 AGENT: Searching the web for "${query}"...`, 'blue');
        try {
            const res = await fetch('/api/fs/search', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({query}) 
            }).then(r => r.json());
            const result = res.success ? `Search Results for '${query}':\n${res.content}` : `Error: ${res.error}`;
            messageHistory.push({ role: "user", content: `TOOL RESULT: ${result}` });
            toolsFound = true;
        } catch (e) { console.error(e); }
    }

    return toolsFound;
}

function appendToolStatusUI(statusText, color = 'yellow') {
    const colorClass = color === 'blue' ? 'text-blue-400' : 'text-yellow-500';
    const bgClass = color === 'blue' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-yellow-500/10 border-yellow-500/20';
    
    const div = document.createElement('div');
    div.className = "max-w-3xl mx-auto flex gap-4 fade-in items-center py-2";
    div.innerHTML = `
        <div class="w-8 h-8 rounded-lg ${bgClass} border flex items-center justify-center flex-shrink-0 ${colorClass}">
            <svg class="animate-pulse" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                ${color === 'blue' 
                    ? '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20"></path>'
                    : '<path d="M21 12a9 9 0 1 1-6.219-8.56"></path>'}
            </svg>
        </div>
        <div class="text-xs font-medium ${colorClass}/80 italic tracking-wide">${statusText}</div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendMessageUI(role, text, files = []) {
    const div = document.createElement('div');
    div.className = "max-w-3xl mx-auto flex gap-4 fade-in items-start";
    
    if (role === 'user') {
        const fileHtml = files.length > 0 ? `
            <div class="attached-files">
                ${files.map(f => `
                    <div class="attached-file-chip">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        ${f.filename}
                    </div>
                `).join('')}
            </div>
        ` : '';

        div.innerHTML = `
            <div class="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <div class="space-y-3 pt-2 max-w-[calc(100%-3rem)]">
                <div class="text-indigo-400 text-xs font-semibold uppercase tracking-widest px-1">You</div>
                ${fileHtml}
                <div class="prose prose-invert prose-p:leading-relaxed text-gray-100">
                    ${text}
                </div>
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="w-10 h-10 rounded-xl glass border border-white/5 flex items-center justify-center flex-shrink-0 text-indigo-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
            </div>
            <div class="space-y-3 pt-2 max-w-[calc(100%-3rem)]">
            <div class="text-gray-400 text-xs font-semibold uppercase tracking-widest px-1">Rogatekno Labs</div>
                <div class="prose prose-invert prose-p:leading-relaxed text-gray-300">
                    ${marked.parse(text)}
                </div>
            </div>
        `;
    }
    
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function createAIPlaceholder() {
    const div = document.createElement('div');
    div.className = "max-w-3xl mx-auto flex gap-4 fade-in items-start";
    div.innerHTML = `
        <div class="w-10 h-10 rounded-xl glass border border-white/5 flex items-center justify-center flex-shrink-0 text-indigo-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
        </div>
        <div class="space-y-1 pt-2 max-w-[calc(100%-3rem)]">
            <div class="text-gray-400 text-xs font-semibold uppercase tracking-widest px-1">Rogatekno Labs</div>
            <div class="message-content prose prose-invert prose-p:leading-relaxed text-gray-300 message-stream"></div>
            <div class="message-perf"></div>
        </div>
    `;
    return div;
}

async function checkStatus() {
    if (isGenerating) return;
    try {
        const res = await fetch('/v1/models');
        const data = await res.json();
        
        if (data.logs && data.logs.length > 0) {
            engineLogs.innerText = data.logs.join('\n');
            engineLogs.scrollTop = engineLogs.scrollHeight;
        }

        if (res.ok && (data.is_ready || data.status === "Ready")) {
            serverStatus.innerText = "System Ready";
            statusDot.classList.remove('bg-red-500', 'bg-amber-500');
            statusDot.classList.add('bg-green-500');
            statusDot.classList.remove('animate-pulse');
            engineLogs.classList.add('hidden');
        } else {
            // Server is UP but engine is STILL LOADING
            serverStatus.innerText = data.status || "Initializing Engine...";
            statusDot.classList.remove('bg-red-500', 'bg-green-500');
            statusDot.classList.add('bg-amber-500'); // Yellow/Amber for loading
            statusDot.classList.add('animate-pulse');
            if (data.status && data.status.includes("Loading")) {
                engineLogs.classList.remove('hidden');
            }
        }
        return true;
    } catch (e) {
        // Fetch failed entirely (Server is DOWN)
        serverStatus.innerText = "Server Offline";
        statusDot.classList.remove('bg-green-500', 'bg-amber-500');
        statusDot.classList.add('bg-red-500');
        statusDot.classList.add('animate-pulse');
        return false;
    }
}

setInterval(checkStatus, 3000);
checkStatus();
checkStatus();
