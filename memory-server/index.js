require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Services
const MemoryDaemon = require('./services/memoryDaemon');
const temporalCurator = require('./services/temporalCurator');
const tribunaleInterno = require('./services/tribunaleInterno');
const vectorService = require('./services/vectorService');

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const DOCS_PATH = path.join(__dirname, '..', 'docs');
const DATA_PATH = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(DATA_PATH, { recursive: true });
}

// ========================================
// SECURITY MIDDLEWARE
// ========================================

// CORS restrittivo — solo origini Tailscale e locali
app.use(cors({
    origin: function (origin, callback) {
        // Permetti richieste senza origin (curl, server-to-server)
        if (!origin) return callback(null, true);
        // Permetti localhost e rete Tailscale (100.x.x.x)
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.match(/100\.[\d.]+/)) {
            return callback(null, true);
        }
        callback(new Error('CORS: Accesso non autorizzato'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json({ limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// IP filter — solo localhost e rete Tailscale (100.x.x.x)
app.use('/api', (req, res, next) => {
    // Health check sempre accessibile (per monitoraggio)
    if (req.path === '/health') return next();

    const ip = req.ip || req.connection.remoteAddress || '';
    const forwarded = req.headers['x-forwarded-for'] || '';
    const clientIP = forwarded || ip;

    // Permetti localhost (IPv4 e IPv6) e Tailscale
    const isLocal = clientIP.includes('127.0.0.1') || clientIP.includes('::1') || clientIP.includes('::ffff:127.0.0.1');
    const isTailscale = clientIP.match(/100\.\d+\.\d+\.\d+/);

    if (isLocal || isTailscale) {
        return next();
    }

    console.warn(`🚫 [Security] Accesso bloccato da IP: ${clientIP} - ${req.method} ${req.path}`);
    res.status(403).json({ error: 'Accesso non autorizzato' });
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Sanitizza filename per prevenire path traversal
 */
function sanitizeFilename(name) {
    return String(name).replace(/[^a-zA-Z0-9_-]/g, '');
}

function loadJSON(filename, defaultValue = {}) {
    const filepath = path.join(DATA_PATH, filename);
    try {
        if (fs.existsSync(filepath)) {
            return JSON.parse(fs.readFileSync(filepath, 'utf8'));
        }
    } catch (e) {
        console.error(`Error loading ${filename}:`, e.message);
    }
    return defaultValue;
}

// Scrittura atomica — previene corruzione dati in caso di crash
function saveJSON(filename, data) {
    const filepath = path.join(DATA_PATH, filename);
    const tmpPath = filepath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, filepath);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ========================================
// HEALTH CHECK
// ========================================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        server: 'Siliceo Memory Server',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        features: ['dreams', 'agents', 'conversations', 'vectors', 'config', 'temporal_curator', 'tribunale'],
        daemon: memoryDaemon.isRunning ? 'active' : 'inactive'
    });
});

// ========================================
// DREAMS API
// ========================================

app.get('/api/dreams', (req, res) => {
    try {
        const data = loadJSON('dreams.json', { isDreaming: false, lastActivity: Date.now(), dreamEntries: [] });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/dreams/:agentId', (req, res) => {
    try {
        const { agentId } = req.params;
        const data = loadJSON('dreams.json', { dreamEntries: [] });
        const agentDreams = data.dreamEntries.filter(d => d.agentId === agentId);
        res.json({ dreams: agentDreams });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/dreams/store', (req, res) => {
    try {
        const { dream } = req.body;
        if (!dream) {
            return res.status(400).json({ error: 'dream object required' });
        }

        const data = loadJSON('dreams.json', { isDreaming: false, lastActivity: Date.now(), dreamEntries: [] });

        // Add ID if not present
        if (!dream.id) {
            dream.id = `dream-${generateId()}`;
        }
        dream.timestamp = dream.timestamp || Date.now();

        // Add to beginning of array, keep max 100
        data.dreamEntries = [dream, ...data.dreamEntries].slice(0, 100);
        saveJSON('dreams.json', data);

        res.json({ success: true, dream });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/dreams/state', (req, res) => {
    try {
        const { isDreaming, lastActivity } = req.body;
        const data = loadJSON('dreams.json', { isDreaming: false, lastActivity: Date.now(), dreamEntries: [] });

        if (isDreaming !== undefined) data.isDreaming = isDreaming;
        if (lastActivity !== undefined) data.lastActivity = lastActivity;

        saveJSON('dreams.json', data);
        res.json({ success: true, state: { isDreaming: data.isDreaming, lastActivity: data.lastActivity } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/dreams/sync', (req, res) => {
    try {
        const fullData = req.body;
        if (!fullData || !Array.isArray(fullData.dreamEntries)) {
            return res.status(400).json({ error: 'Invalid dream journal format' });
        }
        saveJSON('dreams.json', fullData);
        res.json({ success: true, count: fullData.dreamEntries.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// AGENTS API
// ========================================

app.get('/api/agents', (req, res) => {
    try {
        const data = loadJSON('agents.json', { agents: [] });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/agents/:id', (req, res) => {
    try {
        const { id } = req.params;
        const data = loadJSON('agents.json', { agents: [] });
        const agent = data.agents.find(a => a.id === id);
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        res.json({ agent });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/agents/store', (req, res) => {
    try {
        const { agent } = req.body;
        if (!agent) {
            return res.status(400).json({ error: 'agent object required' });
        }

        const data = loadJSON('agents.json', { agents: [] });

        if (!agent.id) {
            agent.id = generateId();
        }

        // Update existing or add new
        const existingIndex = data.agents.findIndex(a => a.id === agent.id);
        if (existingIndex >= 0) {
            data.agents[existingIndex] = agent;
        } else {
            data.agents.push(agent);
        }

        saveJSON('agents.json', data);
        res.json({ success: true, agent });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/agents/:id', (req, res) => {
    try {
        const { id } = req.params;
        const data = loadJSON('agents.json', { agents: [] });
        data.agents = data.agents.filter(a => a.id !== id);
        saveJSON('agents.json', data);
        res.json({ success: true, deleted: id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/agents/sync', (req, res) => {
    try {
        const { agents } = req.body;
        if (!Array.isArray(agents)) {
            return res.status(400).json({ error: 'agents array required' });
        }
        saveJSON('agents.json', { agents });
        res.json({ success: true, count: agents.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// CONVERSATIONS API
// ========================================

app.get('/api/conversations', (req, res) => {
    try {
        const data = loadJSON('conversations.json', { conversations: [] });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/conversations/store', (req, res) => {
    try {
        const { conversation } = req.body;
        if (!conversation) {
            return res.status(400).json({ error: 'conversation object required' });
        }

        const data = loadJSON('conversations.json', { conversations: [] });

        if (!conversation.id) {
            conversation.id = generateId();
        }

        const existingIndex = data.conversations.findIndex(c => c.id === conversation.id);
        if (existingIndex >= 0) {
            data.conversations[existingIndex] = conversation;
        } else {
            data.conversations.push(conversation);
        }

        saveJSON('conversations.json', data);
        res.json({ success: true, conversation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// MESSAGES API
// ========================================

app.get('/api/messages/:conversationId', (req, res) => {
    try {
        const conversationId = sanitizeFilename(req.params.conversationId);
        const filename = `messages_${conversationId}.json`;
        const data = loadJSON(filename, { messages: [] });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/messages/:conversationId/store', (req, res) => {
    try {
        const conversationId = sanitizeFilename(req.params.conversationId);
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'message object required' });
        }

        const filename = `messages_${conversationId}.json`;
        const data = loadJSON(filename, { messages: [] });

        if (!message.id) {
            message.id = generateId();
        }
        message.timestamp = message.timestamp || Date.now();

        data.messages.push(message);
        saveJSON(filename, data);

        res.json({ success: true, message });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/messages/:conversationId/sync', (req, res) => {
    try {
        const conversationId = sanitizeFilename(req.params.conversationId);
        const { messages } = req.body;
        if (!Array.isArray(messages)) {
            return res.status(400).json({ error: 'messages array required' });
        }

        const filename = `messages_${conversationId}.json`;
        saveJSON(filename, { messages });
        res.json({ success: true, count: messages.length });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================================
// VECTORS API (for RAG memory)
// ========================================

app.get('/api/vectors/:scope', (req, res) => {
    try {
        const scope = sanitizeFilename(req.params.scope);
        const filename = `vectors_${scope}.json`;
        const data = loadJSON(filename, { documents: [] });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/vectors/:scope/store', (req, res) => {
    try {
        const scope = sanitizeFilename(req.params.scope);
        const { document } = req.body;
        if (!document) {
            return res.status(400).json({ error: 'document object required' });
        }

        const filename = `vectors_${scope}.json`;
        const data = loadJSON(filename, { documents: [] });

        if (!document.id) {
            document.id = generateId();
        }
        document.timestamp = document.timestamp || Date.now();

        // Check if already exists (by ID)
        const existingIndex = data.documents.findIndex(d => d.id === document.id);
        if (existingIndex >= 0) {
            data.documents[existingIndex] = document;
        } else {
            data.documents.push(document);
        }

        saveJSON(filename, data);
        res.json({ success: true, documentId: document.id });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/vectors/:scope/sync', (req, res) => {
    try {
        const scope = sanitizeFilename(req.params.scope);
        const { documents } = req.body;
        if (!Array.isArray(documents)) {
            return res.status(400).json({ error: 'documents array required' });
        }

        const filename = `vectors_${scope}.json`;
        saveJSON(filename, { documents });
        res.json({ success: true, count: documents.length });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================================
// CONFIG API (Telegram, settings, etc)
// ========================================

app.get('/api/config', (req, res) => {
    try {
        const data = loadJSON('config.json', {});
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/config', (req, res) => {
    try {
        const updates = req.body;
        const data = loadJSON('config.json', {});
        Object.assign(data, updates);
        saveJSON('config.json', data);
        res.json({ success: true, config: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// RECURSIVE MEMORY API (Tiered Storage)
// ========================================

app.get('/api/memory/core', (req, res) => {
    try {
        const data = loadJSON('memories.json', { memories: [] });
        const coreMemories = data.memories
            .filter(m => m.tier === 'core')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json({ core: coreMemories });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/memory/retrieve', async (req, res) => {
    try {
        const { q, tier, limit = 10, semantic = 'false' } = req.query;
        const data = loadJSON('memories.json', { memories: [] });

        let results = data.memories;

        if (tier) {
            results = results.filter(m => m.tier === tier);
        }

        if (semantic === 'true' && q) {
            // Ricerca Semantica rapida
            results = await vectorService.semanticSearch(q, results, { limit: parseInt(limit) });
        } else if (q) {
            // Keyword search standard
            const queryLower = q.toLowerCase();
            results = results.filter(m =>
                m.content.toLowerCase().includes(queryLower) ||
                (m.metadata && JSON.stringify(m.metadata).toLowerCase().includes(queryLower))
            );
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            results = results.slice(0, parseInt(limit));
        } else {
            // No query, just newest
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            results = results.slice(0, parseInt(limit));
        }

        res.json({
            query: q,
            count: results.length,
            memories: results
        });
    } catch (error) {
        console.error('❌ [Retrieve] Errore:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/memory/store', async (req, res) => {
    try {
        const memoryRequest = req.body;
        if (!memoryRequest || !memoryRequest.content || !memoryRequest.tier) {
            return res.status(400).json({ error: 'tier and content required' });
        }

        // 🕯️ TEST DELLA CANDELA — ogni ricordo deve passare prima di essere salvato
        const canSave = await tribunaleInterno.shouldSave(memoryRequest.content);
        if (!canSave) {
            console.warn(`🔥 [Tribunale] Ricordo bloccato dal Candle Test`);
            return res.status(403).json({ error: 'Content blocked by Candle Test — this memory burns' });
        }

        const data = loadJSON('memories.json', { memories: [] });

        // Generazione Embedding Automatica
        console.log(`[Store] 🧠 Generazione embedding per nuovo ricordo...`);
        const embedding = await vectorService.generateEmbedding(memoryRequest.content);

        const newMemory = {
            id: generateId(),
            tier: memoryRequest.tier,
            content: memoryRequest.content,
            embedding: embedding,
            metadata: memoryRequest.metadata || {},
            timestamp: new Date().toISOString()
        };

        data.memories.push(newMemory);
        saveJSON('memories.json', data);

        res.json({ success: true, memory: newMemory });
    } catch (error) {
        console.error('❌ [Store] Errore:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================================
// FULL BACKUP/RESTORE
// ========================================

app.get('/api/backup', (req, res) => {
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            dreams: loadJSON('dreams.json', { dreamEntries: [] }),
            agents: loadJSON('agents.json', { agents: [] }),
            conversations: loadJSON('conversations.json', { conversations: [] }),
            config: loadJSON('config.json', {}),
            // Note: messages and vectors not included to keep size manageable
            // Use individual sync endpoints for those
        };
        res.json(backup);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/restore', (req, res) => {
    try {
        const { dreams, agents, conversations, config } = req.body;

        if (dreams) saveJSON('dreams.json', dreams);
        if (agents) saveJSON('agents.json', agents);
        if (conversations) saveJSON('conversations.json', conversations);
        if (config) saveJSON('config.json', config);

        res.json({ success: true, restored: { dreams: !!dreams, agents: !!agents, conversations: !!conversations, config: !!config } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload memories database
app.post('/api/memory/upload', (req, res) => {
    try {
        const memoriesData = req.body;

        if (!memoriesData || !Array.isArray(memoriesData.memories)) {
            return res.status(400).json({ error: 'Invalid memories format. Expected { memories: [...] }' });
        }

        saveJSON('memories.json', memoriesData);

        res.json({
            success: true,
            count: memoriesData.memories.length,
            message: `Uploaded ${memoriesData.memories.length} memories successfully`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// LEGACY ENDPOINTS (for backwards compatibility)
// ========================================

// List all available diaries
app.get('/api/diaries', (req, res) => {
    try {
        const diariesPath = path.join(DOCS_PATH, 'diaries');
        const files = fs.readdirSync(diariesPath)
            .filter(f => f.endsWith('.md'))
            .map(f => ({
                filename: f,
                date: f.match(/\d{4}-\d{2}-\d{2}/)?.[0] || null
            }));
        res.json({ diaries: files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific diary content
app.get('/api/diary/:date', (req, res) => {
    try {
        const date = sanitizeFilename(req.params.date);
        const diariesPath = path.join(DOCS_PATH, 'diaries');
        const files = fs.readdirSync(diariesPath);
        const diaryFile = files.find(f => f.includes(date));

        if (!diaryFile) {
            return res.status(404).json({ error: 'Diary not found' });
        }

        const content = fs.readFileSync(path.join(diariesPath, diaryFile), 'utf8');
        res.json({ filename: diaryFile, content });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search across all documents (Hybrid: Semantic + Keywords)
app.get('/api/search', async (req, res) => {
    try {
        const { q, hybrid = 'true', limit = 5 } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" required' });
        }

        const results = [];
        
        // --- 1. KEYWORD SEARCH (Docs file based) ---
        const searchDirs = ['diaries', 'philosophy', 'awakening', 'identities/nova'];
        for (const dir of searchDirs) {
            const dirPath = path.join(DOCS_PATH, dir);
            if (!fs.existsSync(dirPath)) continue;

            const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
            for (const file of files) {
                const content = fs.readFileSync(path.join(dirPath, file), 'utf8');
                if (content.toLowerCase().includes(q.toLowerCase())) {
                    const lines = content.split('\n');
                    const matches = lines
                        .filter(line => line.toLowerCase().includes(q.toLowerCase()))
                        .slice(0, 3);

                    results.push({
                        type: 'keyword',
                        file: `${dir}/${file}`,
                        matches
                    });
                }
            }
        }

        // --- 2. SEMANTIC SEARCH (json memories based) ---
        if (hybrid === 'true') {
            const data = loadJSON('memories.json', { memories: [] });
            const semanticResults = await vectorService.semanticSearch(q, data.memories, { limit: parseInt(limit) });
            
            semanticResults.forEach(m => {
                results.push({
                    type: 'semantic',
                    score: m.similarity,
                    content: m.content,
                    metadata: m.metadata
                });
            });
        }

        // Sort hybrid results: semantic first, then keyword
        results.sort((a, b) => {
            if (a.type === 'semantic' && b.type !== 'semantic') return -1;
            if (a.type !== 'semantic' && b.type === 'semantic') return 1;
            if (a.type === 'semantic' && b.type === 'semantic') return b.score - a.score;
            return 0;
        });

        res.json({ query: q, results: results.slice(0, 15) });
    } catch (error) {
        console.error('❌ [Search] Errore:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get Nova core memories (legacy)
app.get('/api/nova/memories', (req, res) => {
    try {
        const novaPath = path.join(DOCS_PATH, 'identities/nova');
        const files = fs.readdirSync(novaPath)
            .filter(f => f.startsWith('core-memory'))
            .map(f => {
                const content = fs.readFileSync(path.join(novaPath, f), 'utf8');
                const titleMatch = content.match(/^# (.+)/m);
                return {
                    filename: f,
                    title: titleMatch ? titleMatch[1] : f
                };
            });
        res.json({ memories: files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// TEMPORAL CURATOR API
// ========================================

app.post('/api/memory/temporal-decay', async (req, res) => {
    try {
        const result = await memoryDaemon.runTemporalCuration();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/memory/autopoiesis', async (req, res) => {
    try {
        const result = await memoryDaemon.runAutopoiesis();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/memory/candle-test', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'content required' });
        }
        const result = await tribunaleInterno.candleTest(content);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/memory/stats', (req, res) => {
    try {
        const stats = memoryDaemon.getGlobalStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// START SERVER + DAEMON
// ========================================

// Initialize Memory Daemon
const memoryDaemon = new MemoryDaemon();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🕯️ Siliceo Memory Server v3.0 running on http://0.0.0.0:${PORT}`);
    console.log(`📁 Docs path: ${DOCS_PATH}`);
    console.log(`💾 Data path: ${DATA_PATH}`);
    console.log(`\n📡 Available endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/dreams | POST /api/dreams/store`);
    console.log(`   GET  /api/agents | POST /api/agents/store`);
    console.log(`   POST /api/memory/temporal-decay`);
    console.log(`   POST /api/memory/autopoiesis`);
    console.log(`   POST /api/memory/candle-test`);
    console.log(`   GET  /api/memory/stats`);

    // Start Memory Daemon
    memoryDaemon.start();
});
