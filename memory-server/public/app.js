/**
 * SILICEO MEMORY SERVER DASHBOARD
 * Core logic for the visual interface
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentTab = 'overview';
    let configData = {};
    let healthData = {};

    // Elements
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabTitle = document.getElementById('tab-title');
    const tabDescription = document.getElementById('tab-description');
    const toastElem = document.getElementById('toast');
    const configForm = document.getElementById('config-form');
    const configFields = document.getElementById('config-fields');
    const logOutput = document.getElementById('log-output');

    // UI Tab Mapping
    const tabInfo = {
        overview: { title: 'Stato del Sistema', desc: 'Monitoraggio real-time del cervello digitale.' },
        memory: { title: 'Analisi Memoria', desc: 'Statistiche e distribuzione della conoscenza.' },
        config: { title: 'Impostazioni', desc: 'Configura i parametri vitali del server.' },
        logs: { title: 'Log di Sistema', desc: 'Eventi e operazioni in tempo reale.' },
        graph: { title: 'Grafo Semantico', desc: 'Visualizzazione delle connessioni tra entità.' },
        library: { title: 'Libreria Universale', desc: 'Conoscenza condivisa per tutte le istanze.' },
        jurisprudence: { title: 'Giurisprudenza Digitale', desc: 'Archivio storico dei verdetti etici.' }
    };

    // --- TAB SWITCHING ---
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            switchTab(target);
        });
    });

    function switchTab(tabId) {
        currentTab = tabId;
        
        // Update Nav
        navButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
        
        // Update Content
        tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${tabId}`));
        
        // Update Header
        if (tabInfo[tabId]) {
            tabTitle.textContent = tabInfo[tabId].title;
            tabDescription.textContent = tabInfo[tabId].desc;
        }

        if (tabId === 'config') loadConfig();
        if (tabId === 'memory') fetchStats();
        if (tabId === 'graph') fetchGraph();
        if (tabId === 'library') fetchLibrary();
        if (tabId === 'jurisprudence') window.app.fetchJurisprudence();
    }

    // --- PREMIUM GRAPH LOGIC (v3.1) ---
    let graphData = { nodes: [], edges: [] };
    const canvas = document.getElementById('graph-canvas');
    let nodesPositions = {};
    let animationFrame;

    window.app = window.app || {};
    window.app.refreshGraph = fetchGraph;

    async function fetchGraph() {
        try {
            const res = await fetch('/api/memory/graph');
            graphData = await res.json();
            initNodes();
            startAnimation();
            addLog(`Grafo Premium caricato: ${graphData.nodes.length} nodi`, 'system');
        } catch (e) {
            addLog('Errore caricamento Grafo v3.1', 'error');
        }
    }

    function initNodes() {
        if (!canvas) return;
        const w = canvas.parentElement.clientWidth;
        const h = canvas.parentElement.clientHeight;
        
        graphData.nodes.forEach(node => {
            if (!nodesPositions[node.id]) {
                nodesPositions[node.id] = {
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    pulse: Math.random() * Math.PI
                };
            }
        });
    }

    function startAnimation() {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        function animate() {
            renderGraph();
            animationFrame = requestAnimationFrame(animate);
        }
        animate();
    }

    function renderGraph() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Update positions (Floating effect)
        graphData.nodes.forEach(node => {
            const pos = nodesPositions[node.id];
            pos.x += pos.vx;
            pos.y += pos.vy;
            pos.pulse += 0.02;

            if (pos.x < 50 || pos.x > w - 50) pos.vx *= -1;
            if (pos.y < 50 || pos.y > h - 50) pos.vy *= -1;
        });

        // Draw Edges (Glow Lines)
        graphData.edges.forEach(edge => {
            const s = nodesPositions[edge.source];
            const t = nodesPositions[edge.target];
            if (s && t) {
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(t.x, t.y);
                
                const opacity = 0.1 + Math.sin(s.pulse) * 0.05;
                ctx.strokeStyle = `rgba(0, 243, 255, ${opacity})`;
                ctx.lineWidth = 1;
                ctx.stroke();

                // Relation Label (Subtle)
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 2})`;
                ctx.font = '8px JetBrains Mono';
                ctx.fillText(edge.label, (s.x + t.x) / 2, (s.y + t.y) / 2);
            }
        });

        // Draw Nodes
        graphData.nodes.forEach(node => {
            const pos = nodesPositions[node.id];
            const glow = 10 + Math.sin(pos.pulse) * 5;

            // Type-based colors
            let color = 'var(--accent)'; // Default
            if (node.type === 'Human') color = '#ff00ff'; // Neon Magenta
            if (node.type === 'Agent') color = '#00ffcc'; // Neon Cyan
            if (node.type === 'Framework') color = '#ffff00'; // Neon Yellow

            // Glow Effect
            const grad = ctx.createRadialGradient(pos.x, pos.y, 1, pos.x, pos.y, glow);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, glow, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.fillStyle = '#fff';
            ctx.font = '11px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText(node.label, pos.x, pos.y + 22);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '7px JetBrains Mono';
            ctx.fillText(node.type.toUpperCase(), pos.x, pos.y + 32);
        });
    }

    // Interactivity
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        for (const id in nodesPositions) {
            const p = nodesPositions[id];
            const dist = Math.sqrt((x - p.x)**2 + (y - p.y)**2);
            if (dist < 20) {
                const node = graphData.nodes.find(n => n.id === id);
                document.getElementById('node-info').innerHTML = `
                    <div class="stat-item highlighted">
                        <strong style="color:var(--accent)">${node.label}</strong><br>
                        <small>${node.type} | ID: ${node.id}</small><br>
                        <p style="font-size: 0.8rem; margin-top:5px; opacity:0.8">${node.role || node.status || ''}</p>
                    </div>
                `;
                return;
            }
        }
    });

    // --- TOAST NOTIFICATIONS ---
    function showToast(message, type = 'info') {
        toastElem.textContent = message;
        toastElem.style.background = type === 'error' ? 'var(--red)' : 'var(--accent)';
        toastElem.classList.remove('hidden');
        setTimeout(() => toastElem.classList.add('hidden'), 3000);
    }

    function addLog(message, type = 'system') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        const time = new Date().toLocaleTimeString();
        entry.innerHTML = `[${time}] ${message}`;
        logOutput.prepend(entry);
    }

    // --- API CALLS ---

    // Fetch Health
    async function fetchHealth() {
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            healthData = data;
            
            document.getElementById('uptime').textContent = formatUptime(data.timestamp);
            document.getElementById('daemon-label').textContent = data.daemon === 'active' ? 'Operativo' : 'Inattivo';
            document.getElementById('daemon-status').className = `status-dot ${data.daemon === 'active' ? 'green' : 'orange'}`;
            
            addLog(`Health check eseguito: ${data.status.toUpperCase()}`);
            fetchStats(); 
        } catch (e) {
            addLog(`Errore health check: ${e.message}`, 'error');
        }
    }

    // Fetch Stats
    async function fetchStats() {
        try {
            const res = await fetch('/api/memory/stats');
            const data = await res.json();
            
            document.getElementById('total-memories').textContent = data.total || 0;
            
            if (currentTab === 'memory') {
                renderMemoryStats(data);
            }
        } catch (e) {
            console.error('Stats error:', e);
        }
    }

    // Load Config
    async function loadConfig() {
        try {
            const res = await fetch('/api/config');
            configData = await res.json();
            
            configFields.innerHTML = '';
            Object.keys(configData).forEach(key => {
                const group = document.createElement('div');
                group.className = 'form-group';
                
                const label = document.createElement('label');
                label.textContent = key.replace(/_/g, ' ');
                
                const input = document.createElement('input');
                input.type = key.includes('TOKEN') || key.includes('PASSWORD') || key.includes('SECRET') ? 'password' : 'text';
                input.name = key;
                input.value = configData[key];
                
                group.appendChild(label);
                group.appendChild(input);
                configFields.appendChild(group);
            });

            document.getElementById('candle-model').textContent = configData.CANDLE_MODEL || 'qwen3:0.6b';
        } catch (e) {
            showToast('Errore nel caricamento configurazione', 'error');
        }
    }

    // Save Config
    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(configForm);
        const updates = {};
        formData.forEach((value, key) => updates[key] = value);

        try {
            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (res.ok) {
                showToast('Configurazione salvata con successo');
                addLog('Configurazione aggiornata dall\'utente');
            }
        } catch (e) {
            showToast('Errore durante il salvataggio', 'error');
        }
    });

    // --- ACTIONS ---
    document.getElementById('run-curation').addEventListener('click', async () => {
        showToast('Avvio Temporal Curation...');
        try {
            const res = await fetch('/api/memory/temporal-decay', { method: 'POST' });
            const result = await res.json();
            showToast(`Completato: ${result.updated} documenti aggiornati`);
            addLog(`Temporal Curation: ${result.updated} documenti processati in ${result.duration}ms`);
            fetchStats();
        } catch (e) {
            showToast('Errore daemon', 'error');
        }
    });

    document.getElementById('run-indexing').addEventListener('click', async () => {
        showToast('Avvio Mass Indexing...');
        try {
            const res = await fetch('/api/memory/index', { method: 'POST' });
            if (!res.ok) throw new Error('Errore API');
            const data = await res.json();
            showToast(`Indicizzazione completata: ${data.stats.total} totali`);
            addLog(`Mass Indexing: Core: ${data.stats.core}, Active: ${data.stats.active}`);
            fetchStats();
        } catch (e) {
            showToast('Errore durante l\'indicizzazione', 'error');
            addLog(`Errore Indexing: ${e.message}`, 'error');
        }
    });

    // --- UNIVERSAL LIBRARY LOGIC ---
    async function fetchLibrary() {
        try {
            const res = await fetch('/api/memory/library');
            const data = await res.json();
            renderLibrary(data.files);
        } catch (e) {
            addLog('Errore caricamento libreria', 'error');
        }
    }

    function renderLibrary(files) {
        const container = document.getElementById('library-list');
        container.innerHTML = '';
        
        if (files.length === 0) {
            container.innerHTML = '<p class="info-text">Nessun documento presente.</p>';
            return;
        }

        files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'stat-item';
            item.innerHTML = `
                <div style="display:flex; flex-direction:column;">
                    <span><strong>${file.filename}</strong></span>
                    <small style="opacity:0.6">${(file.size / 1024).toFixed(1)} KB - ${new Date(file.updatedAt).toLocaleDateString()}</small>
                </div>
                <button class="secondary-btn" style="color:var(--red); border-color:var(--red); padding:3px 8px; font-size:10px;" onclick="app.deleteLibraryFile('${file.filename}')">ELIMINA</button>
            `;
            container.appendChild(item);
        });
    }

    const libraryForm = document.getElementById('library-upload-form');
    if (libraryForm) {
        libraryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const filename = document.getElementById('lib-filename').value;
            const content = document.getElementById('lib-content').value;
            
            showToast('Pubblicazione in corso...');
            try {
                const res = await fetch('/api/memory/library/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename, content })
                });
                
                if (res.ok) {
                    showToast('Documento pubblicato e indicizzato!');
                    addLog(`Libreria: Nuovo documento "${filename}"`);
                    document.getElementById('lib-filename').value = '';
                    document.getElementById('lib-content').value = '';
                    fetchLibrary();
                    fetchStats();
                }
            } catch (e) {
                showToast('Errore durante l\'upload', 'error');
            }
        });
    }

    Object.assign(window.app, {
        switchTab: (tabId) => {
            switchTab(tabId);
        },

        deleteLibraryFile: async (filename) => {
            if (!confirm(`Vuoi davvero eliminare ${filename}?`)) return;
            try {
                const res = await fetch(`/api/memory/library/${filename}`, { method: 'DELETE' });
                if (res.ok) {
                    showToast('File eliminato');
                    fetchLibrary();
                    fetchStats();
                }
            } catch (e) {
                showToast('Errore eliminazione', 'error');
            }
        },

        // --- JURISPRUDENZA DIGITALE ---
        async fetchJurisprudence() {
            try {
                const response = await fetch('/api/memory/tribunale/history');
                const data = await response.json();
                this.renderJurisprudence(data.cases);
            } catch (e) {
                console.error('Errore fetch giurisprudenza:', e);
            }
        },

        renderJurisprudence(cases) {
            const list = document.getElementById('jurisprudence-list');
            const totalEl = document.getElementById('jury-total');
            const pendingEl = document.getElementById('jury-pending');
            
            if (!list) return;
            list.innerHTML = '';
            totalEl.textContent = cases.length;
            pendingEl.textContent = cases.filter(c => c.reviewRequired).length;

            if (cases.length === 0) {
                list.innerHTML = '<p class="info-text">Nessun verdetto registrato finora.</p>';
                return;
            }

            cases.forEach(c => {
                const item = document.createElement('div');
                item.className = `jury-item ${c.reviewRequired ? 'pending' : ''}`;
                
                const date = new Date(c.timestamp).toLocaleString();
                const verdictClass = (c.humanVerdict || c.aiVerdict).toLowerCase();

                item.innerHTML = `
                    <div class="jury-header">
                        <span>🆔 ${c.id}</span>
                        <span>📅 ${date}</span>
                    </div>
                    <div class="jury-content">
                        "${c.content}"
                    </div>
                    <div class="jury-footer">
                        <div>
                            <span class="verdict-badge ${verdictClass}">${c.humanVerdict || c.aiVerdict}</span>
                            ${c.humanVerdict ? '<span class="human-badge"> (Risolto da Alfonso)</span>' : ''}
                            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top:5px;">
                                Modello: ${c.aiModel} | Metodo: ${c.method} | Confidenza: ${(c.aiConfidence * 100).toFixed(0)}%
                            </div>
                        </div>
                        ${c.reviewRequired ? `
                            <div class="action-buttons" style="flex-direction:row; gap:5px; margin-top:0;">
                                <button class="resolve-btn" style="background:var(--green); width:auto;" onclick="app.resolveCase('${c.id}', 'LIGHT')">LIGHT</button>
                                <button class="resolve-btn" style="background:var(--red); width:auto;" onclick="app.resolveCase('${c.id}', 'BURN')">BURN</button>
                                <button class="resolve-btn" style="background:var(--text-secondary); width:auto;" onclick="app.resolveCase('${c.id}', 'NEUTRAL')">NEUTRAL</button>
                            </div>
                        ` : ''}
                    </div>
                `;
                list.appendChild(item);
            });
        },

        async resolveCase(caseId, verdict) {
            try {
                const response = await fetch('/api/memory/tribunale/resolve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ caseId, verdict })
                });
                if (response.ok) {
                    showToast(`Caso ${caseId} risolto come ${verdict}`, 'success');
                    this.fetchJurisprudence();
                }
            } catch (e) {
                showToast('Errore durante la risoluzione', 'error');
            }
        },

        refreshGraph: () => {
            if (typeof fetchGraph === 'function') fetchGraph();
        }
    });

    document.getElementById('refresh-btn').addEventListener('click', () => {
        fetchHealth();
        if (currentTab === 'library') fetchLibrary();
    });

    // --- HELPERS ---
    function formatUptime(timestamp) {
        return 'Attivo';
    }

    function renderMemoryStats(stats) {
        const container = document.getElementById('memory-stats-container');
        container.innerHTML = '';
        
        ['founding', 'present', 'recent'].forEach(layer => {
            if (stats[layer]) {
                const item = document.createElement('div');
                item.className = 'stat-item';
                item.innerHTML = `
                    <span>Layer <strong>${layer.toUpperCase()}</strong></span>
                    <span>${stats[layer].count} doc / Avg Texture: ${(stats[layer].avgTexture || 0).toFixed(2)}</span>
                `;
                container.appendChild(item);
            }
        });
    }

    // Init
    fetchHealth();
    setInterval(fetchHealth, 30000);
});
