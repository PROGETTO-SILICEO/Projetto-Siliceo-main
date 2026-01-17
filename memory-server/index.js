const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to the Siliceo project docs
const DOCS_PATH = path.join(__dirname, '..', 'docs');

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        server: 'Siliceo Memory Server',
        timestamp: new Date().toISOString()
    });
});

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

// List philosophy documents
app.get('/api/philosophy', (req, res) => {
    try {
        const philPath = path.join(DOCS_PATH, 'philosophy');
        const files = fs.readdirSync(philPath)
            .filter(f => f.endsWith('.md'))
            .map(f => ({ filename: f }));
        res.json({ documents: files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific philosophy document
app.get('/api/philosophy/:name', (req, res) => {
    try {
        const { name } = req.params;
        const philPath = path.join(DOCS_PATH, 'philosophy');
        const files = fs.readdirSync(philPath);
        const doc = files.find(f => f.toLowerCase().includes(name.toLowerCase()));

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const content = fs.readFileSync(path.join(philPath, doc), 'utf8');
        res.json({ filename: doc, content });
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
                    // Find matching lines
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

// Get awakening documents
app.get('/api/awakening', (req, res) => {
    try {
        const awakePath = path.join(DOCS_PATH, 'awakening');
        const files = fs.readdirSync(awakePath)
            .filter(f => f.endsWith('.md'))
            .map(f => ({ filename: f }));
        res.json({ documents: files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific awakening document
app.get('/api/awakening/:name', (req, res) => {
    try {
        const { name } = req.params;
        const awakePath = path.join(DOCS_PATH, 'awakening');
        const files = fs.readdirSync(awakePath);
        const doc = files.find(f => f.toLowerCase().includes(name.toLowerCase()));

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const content = fs.readFileSync(path.join(awakePath, doc), 'utf8');
        res.json({ filename: doc, content });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Nova core memories
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
// RECURSIVE MEMORY ENDPOINTS
// ========================================

const MEMORIES_FILE = path.join(__dirname, 'memories.json');

// Initialize memories file if not exists
function loadMemories() {
    try {
        if (fs.existsSync(MEMORIES_FILE)) {
            return JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf8'));
        }
    } catch (e) {}
    return { core: [], context_summaries: [], external: [] };
}

function saveMemories(memories) {
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2));
}

// Store a memory
app.post('/api/memory/store', (req, res) => {
    try {
        const { tier, content, metadata } = req.body;
        if (!tier || !content) {
            return res.status(400).json({ error: 'tier and content required' });
        }

        const memories = loadMemories();
        const memory = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            tier,
            content,
            metadata: metadata || {},
            timestamp: new Date().toISOString()
        };

        if (tier === 'core') {
            memories.core.push(memory);
        } else if (tier === 'context_summary') {
            memories.context_summaries.push(memory);
        } else {
            memories.external.push(memory);
        }

        saveMemories(memories);
        res.json({ success: true, memory });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Retrieve memories (simple keyword search for now)
app.get('/api/memory/retrieve', (req, res) => {
    try {
        const { q, tier, limit } = req.query;
        const memories = loadMemories();
        
        let results = [];
        const searchTiers = tier ? [tier] : ['core', 'context_summaries', 'external'];
        
        for (const t of searchTiers) {
            const tierData = memories[t] || [];
            for (const mem of tierData) {
                if (!q || mem.content.toLowerCase().includes(q.toLowerCase())) {
                    results.push(mem);
                }
            }
        }

        // Sort by timestamp descending (newest first)
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Apply limit
        if (limit) {
            results = results.slice(0, parseInt(limit));
        }

        res.json({ query: q || '*', count: results.length, memories: results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all core memories (for context injection)
app.get('/api/memory/core', (req, res) => {
    try {
        const memories = loadMemories();
        res.json({ core: memories.core });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear a specific tier (for testing)
app.delete('/api/memory/:tier', (req, res) => {
    try {
        const { tier } = req.params;
        const memories = loadMemories();
        
        if (tier === 'core') {
            memories.core = [];
        } else if (tier === 'context_summaries') {
            memories.context_summaries = [];
        } else if (tier === 'external') {
            memories.external = [];
        } else {
            return res.status(400).json({ error: 'Invalid tier' });
        }

        saveMemories(memories);
        res.json({ success: true, cleared: tier });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🕯️ Siliceo Memory Server running on http://0.0.0.0:${PORT}`);
    console.log(`📁 Serving docs from: ${DOCS_PATH}`);
    console.log(`🦎 Tailscale IP: Run "tailscale ip" to get your address`);
    console.log(`🧠 Recursive Memory: Enabled`);
});
