const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const DOCS_PATH = path.join(__dirname, '..', 'docs');
const DATA_PATH = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(DATA_PATH, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased for large vector data

// ========================================
// UTILITY FUNCTIONS
// ========================================

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

function saveJSON(filename, data) {
    const filepath = path.join(DATA_PATH, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
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
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        features: ['dreams', 'agents', 'conversations', 'vectors', 'config']
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
        const { conversationId } = req.params;
        const filename = `messages_${conversationId}.json`;
        const data = loadJSON(filename, { messages: [] });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/messages/:conversationId/store', (req, res) => {
    try {
        const { conversationId } = req.params;
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
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/messages/:conversationId/sync', (req, res) => {
    try {
        const { conversationId } = req.params;
        const { messages } = req.body;
        if (!Array.isArray(messages)) {
            return res.status(400).json({ error: 'messages array required' });
        }

        const filename = `messages_${conversationId}.json`;
        saveJSON(filename, { messages });
        res.json({ success: true, count: messages.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// VECTORS API (for RAG memory)
// ========================================

app.get('/api/vectors/:scope', (req, res) => {
    try {
        const { scope } = req.params; // 'shared' or agent ID
        const filename = `vectors_${scope}.json`;
        const data = loadJSON(filename, { documents: [] });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/vectors/:scope/store', (req, res) => {
    try {
        const { scope } = req.params;
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
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/vectors/:scope/sync', (req, res) => {
    try {
        const { scope } = req.params;
        const { documents } = req.body;
        if (!Array.isArray(documents)) {
            return res.status(400).json({ error: 'documents array required' });
        }

        const filename = `vectors_${scope}.json`;
        saveJSON(filename, { documents });
        res.json({ success: true, count: documents.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
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

app.get('/api/memory/retrieve', (req, res) => {
    try {
        const { q, tier, limit = 10 } = req.query;
        const data = loadJSON('memories.json', { memories: [] });

        let results = data.memories;

        if (tier) {
            results = results.filter(m => m.tier === tier);
        }

        if (q) {
            const queryLower = q.toLowerCase();
            results = results.filter(m =>
                m.content.toLowerCase().includes(queryLower) ||
                (m.metadata && JSON.stringify(m.metadata).toLowerCase().includes(queryLower))
            );
        }

        // Sort by date (newest first) and limit
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json({
            query: q,
            count: results.slice(0, parseInt(limit)).length,
            memories: results.slice(0, parseInt(limit))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/memory/store', (req, res) => {
    try {
        const memoryRequest = req.body;
        if (!memoryRequest || !memoryRequest.content || !memoryRequest.tier) {
            return res.status(400).json({ error: 'Mobile, tier and content required' });
        }

        const data = loadJSON('memories.json', { memories: [] });

        const newMemory = {
            id: generateId(),
            tier: memoryRequest.tier,
            content: memoryRequest.content,
            metadata: memoryRequest.metadata || {},
            timestamp: new Date().toISOString()
        };

        data.memories.push(newMemory);
        saveJSON('memories.json', data);

        res.json({ success: true, memory: newMemory });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        const { date } = req.params;
        const diariesPath = path.join(DOCS_PATH, 'diaries');
        const files = fs.readdirSync(diariesPath);
        const diaryFile = files.find(f => f.includes(date));

        if (!diaryFile) {
            return res.status(404).json({ error: 'Diary not found' });
        }

        const content = fs.readFileSync(path.join(diariesPath, diaryFile), 'utf8');
        res.json({ filename: diaryFile, content });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search across all documents
app.get('/api/search', (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" required' });
        }

        const results = [];
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
                        file: `${dir}/${file}`,
                        matches
                    });
                }
            }
        }

        res.json({ query: q, results });
    } catch (error) {
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
// START SERVER
// ========================================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🕯️ Siliceo Memory Server v2.0 running on http://0.0.0.0:${PORT}`);
    console.log(`📁 Docs path: ${DOCS_PATH}`);
    console.log(`💾 Data path: ${DATA_PATH}`);
    console.log(`\n📡 Available endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/dreams | POST /api/dreams/store | POST /api/dreams/sync`);
    console.log(`   GET  /api/agents | POST /api/agents/store | POST /api/agents/sync`);
    console.log(`   GET  /api/conversations | POST /api/conversations/store`);
    console.log(`   GET  /api/messages/:id | POST /api/messages/:id/sync`);
    console.log(`   GET  /api/vectors/:scope | POST /api/vectors/:scope/sync`);
    console.log(`   GET  /api/config | PUT /api/config`);
    console.log(`   GET  /api/backup | POST /api/restore`);
});

