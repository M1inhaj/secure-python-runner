let tabs = [
    { name: "main.py", content: "def greet(name):\n    print(f\"Hello, {name}!\")\n\ngreet(\"World\")" }
];
let activeTabIndex = 0;

// --- UPDATED: Render Tabs with Close Buttons ---
function renderTabs() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';
    
    tabs.forEach((tab, index) => {
        const tabDiv = document.createElement('div');
        tabDiv.className = `tab ${index === activeTabIndex ? 'active' : ''}`;
        
        // Only show the close button if there is more than 1 tab open
        const closeBtnHtml = tabs.length > 1 
            ? `<i class="fas fa-times tab-close" onclick="closeTab(${index}, event)" title="Close"></i>` 
            : '';
            
        tabDiv.innerHTML = `<i class="fab fa-python" style="color: #4B8BBE;"></i> ${tab.name} ${closeBtnHtml}`;
        tabDiv.onclick = () => switchTab(index);
        container.appendChild(tabDiv);
    });
}

// --- NEW: Close Tab Logic ---
function closeTab(index, event) {
    // Prevent the click from triggering the tab switch
    event.stopPropagation();
    
    // Remove the tab from our data array
    tabs.splice(index, 1);
    
    // Adjust the active tab if necessary
    if (activeTabIndex === index) {
        // If we closed the tab we were looking at, shift view to the left (or 0)
        activeTabIndex = Math.max(0, index - 1);
        if (window.editor) {
            window.editor.setValue(tabs[activeTabIndex].content);
        }
    } else if (activeTabIndex > index) {
        // If we closed a tab to the left of our active one, shift the index tracker down by 1
        activeTabIndex--;
    }
    
    renderTabs();
}

function switchTab(index) {
    if (!window.editor) return;
    tabs[activeTabIndex].content = window.editor.getValue();
    activeTabIndex = index;
    window.editor.setValue(tabs[activeTabIndex].content);
    renderTabs();
}

function switchBottomTab(tabName) {
    const termBox = document.getElementById('terminal-box');
    const probBox = document.getElementById('problems-box');
    const termTab = document.getElementById('tab-terminal');
    const probTab = document.getElementById('tab-problems');

    if (tabName === 'terminal') {
        termBox.style.display = 'block';
        probBox.style.display = 'none';
        termTab.classList.add('active');
        probTab.classList.remove('active');
    } else {
        termBox.style.display = 'none';
        probBox.style.display = 'block';
        termTab.classList.remove('active');
        probTab.classList.add('active');
    }
}

function clearTerminal() {
    document.getElementById('terminal-output').innerHTML = "";
    document.getElementById('terminal-input').value = "";
}

function newTab() {
    if (!window.editor) return;
    tabs[activeTabIndex].content = window.editor.getValue();
    const newTabName = `script${tabs.length}.py`;
    tabs.push({ name: newTabName, content: "" });
    activeTabIndex = tabs.length - 1;
    window.editor.setValue("");
    renderTabs();
}

function editorUndo() { if (window.editor) window.editor.trigger('keyboard', 'undo', null); }
function editorRedo() { if (window.editor) window.editor.trigger('keyboard', 'redo', null); }

function toggleFullScreen() {
    const editorCard = document.getElementById('editor-card');
    if (!document.fullscreenElement) {
        editorCard.requestFullscreen().catch(err => console.error("Error attempting to enable fullscreen:", err));
    } else {
        document.exitFullscreen();
    }
}

// --- OPTED OUT: Removed Monaco Error Squigglies, kept UI logic ---
function parsePythonErrors(output) {
    const problems = [];
    const lines = output.split('\n');
    const currentFileName = tabs[activeTabIndex].name;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`File "${currentFileName}"`)) {
            const match = lines[i].match(/line (\d+)/);
            const lineNum = match ? parseInt(match[1]) : 1;
            
            let errorMsg = "Execution Error";
            let colNum = 1;

            for (let j = i + 1; j < lines.length; j++) {
                const lineStr = lines[j];
                if (lineStr.trim().startsWith('^')) {
                    colNum = Math.max(1, lineStr.indexOf('^') - 3);
                } else if (lineStr.trim() !== "" && !lineStr.startsWith(' ') && !lineStr.includes('** Process exited')) {
                    errorMsg = lineStr.trim();
                    break; 
                }
            }
            
            problems.push({ file: currentFileName, line: lineNum, col: colNum, msg: errorMsg });
            break;
        }
    }
    
    updateProblemsUI(problems);
}

function updateProblemsUI(problems) {
    const badge = document.getElementById('problem-badge');
    const list = document.getElementById('problems-list');
    
    if (problems.length > 0) {
        badge.innerText = problems.length;
        badge.classList.add('show');
    } else {
        badge.classList.remove('show');
    }

    if (problems.length === 0) {
        list.innerHTML = `<div style="color: #888; font-style: italic;">No problems have been detected.</div>`;
        return;
    }

    let html = `<div class="problem-file"><i class="fab fa-python" style="color: #4B8BBE;"></i> ${problems[0].file}</div>`;
    
    problems.forEach(p => {
        html += `
            <div class="problem-item">
                <div class="problem-msg"><i class="fas fa-times-circle" style="color: #ef4444;"></i> ${p.msg}</div>
                <div class="problem-loc">[Ln ${p.line}, Col ${p.col}]</div>
            </div>
        `;
    });

    list.innerHTML = html;
    switchBottomTab('problems'); 
}

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs' } });
require(['vs/editor/editor.main'], function () {
    window.editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: tabs[0].content,
        language: 'python',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false
    });

    window.editor.onDidChangeCursorPosition((e) => {
        document.getElementById('cursor-pos').innerText = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });

    renderTabs();
});

const socket = io({ autoConnect: false });
const outputBox = document.getElementById('terminal-output');
const inputBox = document.getElementById('terminal-input');
let currentRunOutput = "";

function scrollToBottom() {
    const terminalBox = document.getElementById('terminal-box');
    terminalBox.scrollTop = terminalBox.scrollHeight;
}

function runCode() {
    const code = window.editor.getValue();
    
    outputBox.innerHTML = "";
    inputBox.value = "";
    inputBox.disabled = false;
    currentRunOutput = ""; 
    updateProblemsUI([]); 
    switchBottomTab('terminal');
    
    socket.connect();
    socket.emit('run_code', code);
    inputBox.focus();
}

socket.on('terminal_output', (data) => {
    const currentFileName = tabs[activeTabIndex].name;
    let cleanData = data.replace(/\/app\/temp\.py/g, currentFileName);
    const safeData = cleanData.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    outputBox.innerHTML += safeData;
    currentRunOutput += cleanData; 
    
    scrollToBottom();
});

socket.on('process_exit', (code) => {
    outputBox.innerHTML += `\n\n** Process exited - Return Code: ${code} **\n`;
    inputBox.disabled = true;
    scrollToBottom();
    socket.disconnect();

    if (code !== 0) {
        parsePythonErrors(currentRunOutput);
    }
});

inputBox.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const text = inputBox.value;
        outputBox.innerHTML += text + "\n";
        socket.emit('terminal_input', text);
        inputBox.value = ""; 
        scrollToBottom();
    }
});