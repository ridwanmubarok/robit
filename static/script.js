const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const serverStatus = document.getElementById('server-status');
const statusDot = document.getElementById('status-dot');
const engineLogs = document.getElementById('engine-logs'); // New log container
const newChatBtn = document.getElementById('new-chat-btn');

let messageHistory = [
    { role: "system", content: "You are a helpful and concise AI assistant." }
];

// Configure marked with custom renderer for premium code blocks
const renderer = new marked.Renderer();
const originalCodeRenderer = renderer.code.bind(renderer);

renderer.code = function(code, lang) {
    const language = lang || 'plaintext';
    let highlighted;
    
    try {
        if (lang && hljs.getLanguage(lang)) {
            highlighted = hljs.highlight(code, { language: lang }).value;
        } else {
            highlighted = hljs.highlightAuto(code).value;
        }
    } catch (e) {
        highlighted = code;
    }

    return `
        <div class="code-container fade-in">
            <div class="code-header">
                <span class="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"></path><path d="m6 8-4 4 4 4"></path><path d="m14.5 4-5 16"></path></svg>
                    ${language}
                </span>
                <button class="copy-btn" onclick="copyCode(this)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                    <span>Copy</span>
                </button>
            </div>
            <pre><code class="hljs language-${language}">${highlighted}</code></pre>
        </div>
    `;
};

marked.setOptions({ renderer, breaks: true });

// Function to copy code
window.copyCode = async (btn) => {
    const container = btn.closest('.code-container');
    const code = container.querySelector('code').innerText;
    
    try {
        await navigator.clipboard.writeText(code);
        
        // Visual feedback
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

// Auto-resize textarea
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
});

// Handle Enter key
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);

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
    messageHistory = [
        { role: "system", content: "You are a helpful and concise AI assistant." }
    ];
});

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || userInput.disabled) return;

    // Add user message to UI
    appendMessageUI('user', text);
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Disable input while generating
    userInput.disabled = true;
    sendBtn.disabled = true;

    // Add message to history
    messageHistory.push({ role: "user", content: text });

    const aiBubble = createAIPlaceholder();
    chatMessages.appendChild(aiBubble);
    const contentDiv = aiBubble.querySelector('.message-content');
    const perfDiv = aiBubble.querySelector('.message-perf');
    
    chatMessages.scrollTop = chatMessages.scrollHeight;

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
        
        const endTime = performance.now();
        const duration = ((endTime - (firstTokenTime || startTime)) / 1000).toFixed(2);
        const tps = (tokenCount / (duration > 0 ? duration : 1)).toFixed(2);

        // Display results in the performance badge
        perfDiv.innerHTML = `
            <div class="perf-badge fade-in">
                <span>Time: <span class="perf-value">${duration}s</span></span>
                <span>Tokens: <span class="perf-value">${tokenCount}</span></span>
                <span>Speed: <span class="perf-value">${tps} t/s</span></span>
            </div>
        `;

        messageHistory.push({ role: "assistant", content: fullAIResponse });

    } catch (error) {
        console.error(error);
        contentDiv.innerHTML = `<span class="text-red-400">Error: ${error.message}</span>`;
    } finally {
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

function appendMessageUI(role, text) {
    const div = document.createElement('div');
    div.className = "max-w-3xl mx-auto flex gap-4 fade-in items-start";
    
    if (role === 'user') {
        div.innerHTML = `
            <div class="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <div class="space-y-3 pt-2 max-w-[calc(100%-3rem)]">
                <div class="text-indigo-400 text-xs font-semibold uppercase tracking-widest px-1">You</div>
                <div class="prose prose-invert prose-p:leading-relaxed text-gray-100">
                    ${text}
                </div>
            </div>
        `;
    } else {
        // This is usually for static AI messages if any
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

// Check server status
async function checkStatus() {
    try {
        const res = await fetch('/v1/models');
        const data = await res.json();
        
        // Update logs in UI
        if (data.logs && data.logs.length > 0) {
            engineLogs.innerText = data.logs.join('\n');
            engineLogs.scrollTop = engineLogs.scrollHeight;
        }

        if (res.ok && data.is_ready) {
            serverStatus.innerText = "Online - Rogatekno Labs";
            statusDot.classList.remove('bg-red-500');
            statusDot.classList.add('bg-green-500');
            statusDot.classList.remove('animate-pulse');
            engineLogs.classList.add('hidden'); // Optional: hide logs when ready
            return true;
        } else {
            serverStatus.innerText = data.status || "Loading Model...";
            engineLogs.classList.remove('hidden');
            throw new Error(data.status);
        }
    } catch (e) {
        statusDot.classList.remove('bg-green-500');
        statusDot.classList.add('bg-red-500');
        statusDot.classList.add('animate-pulse');
        return false;
    }
}

setInterval(checkStatus, 3000);
checkStatus();
