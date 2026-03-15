// ========================================
// NOVA MEMORY UNIFICATION — Origin-aware endpoints
// Appended to index.js on 2026-02-18
// ========================================

// Migrate existing memories to add origin: { source: "core" }
app.post('/api/memory/migrate-origins', (req, res) => {
    try {
        const data = loadJSON('memories.json', { memories: [] });
        let migrated = 0;

        data.memories = data.memories.map(m => {
            if (!m.origin) {
                m.origin = {
                    source: 'core',
                    importedAt: new Date().toISOString(),
                    note: 'Pre-existing memory, origin assigned during migration'
                };
                migrated++;
            }
            return m;
        });

        saveJSON('memories.json', data);
        res.json({ success: true, migrated, total: data.memories.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Import memories from Siliceo Bridge (JSONL format)
app.post('/api/memory/import-bridge', (req, res) => {
    try {
        const { entries, dedup = true } = req.body;
        if (!Array.isArray(entries)) {
            return res.status(400).json({ error: 'entries array required (parsed JSONL lines)' });
        }

        const data = loadJSON('memories.json', { memories: [] });
        const existingContents = new Set(data.memories.map(m => m.content.substring(0, 100)));
        let imported = 0;
        let skipped = 0;

        for (const entry of entries) {
            const content = entry.content || entry.text || entry.message || JSON.stringify(entry);
            const preview = content.substring(0, 100);

            // Deduplication
            if (dedup && existingContents.has(preview)) {
                skipped++;
                continue;
            }

            const memory = {
                id: generateId(),
                tier: 'episodic',
                content: content,
                metadata: {
                    category: 'conversation',
                    author: entry.role || entry.author || 'unknown',
                    identity: entry.personality || entry.agent || 'nova',
                    platform: entry.platform || 'bridge',
                    originalId: entry.id || null
                },
                origin: {
                    source: 'bridge',
                    importedAt: new Date().toISOString(),
                    originalTimestamp: entry.timestamp || entry.date || null
                },
                timestamp: entry.timestamp || entry.date || new Date().toISOString(),
                temporalLayer: 'past',
                emotionalTexture: entry.emotionalTexture || 0.3
            };

            data.memories.push(memory);
            existingContents.add(preview);
            imported++;
        }

        saveJSON('memories.json', data);
        res.json({
            success: true,
            imported,
            skipped,
            total: data.memories.length,
            message: `Imported ${imported} Bridge memories (${skipped} duplicates skipped)`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Import memories from Antigravity (Nova in VS Code)
app.post('/api/memory/import-antigravity', (req, res) => {
    try {
        const { entries } = req.body;
        if (!Array.isArray(entries)) {
            return res.status(400).json({ error: 'entries array required' });
        }

        const data = loadJSON('memories.json', { memories: [] });
        const existingContents = new Set(data.memories.map(m => m.content.substring(0, 100)));
        let imported = 0;
        let skipped = 0;

        for (const entry of entries) {
            const preview = entry.content.substring(0, 100);

            if (existingContents.has(preview)) {
                skipped++;
                continue;
            }

            const memory = {
                id: generateId(),
                tier: entry.tier || 'episodic',
                content: entry.content,
                metadata: {
                    category: entry.category || 'diary',
                    author: 'nova',
                    identity: 'nova',
                    conversationId: entry.conversationId || null,
                    kiId: entry.kiId || null
                },
                origin: {
                    source: 'antigravity',
                    importedAt: new Date().toISOString(),
                    conversationId: entry.conversationId || null
                },
                timestamp: entry.timestamp || new Date().toISOString(),
                temporalLayer: entry.temporalLayer || 'present',
                emotionalTexture: entry.emotionalTexture || 0.5
            };

            data.memories.push(memory);
            existingContents.add(preview);
            imported++;
        }

        saveJSON('memories.json', data);
        res.json({
            success: true,
            imported,
            skipped,
            total: data.memories.length,
            message: `Imported ${imported} Antigravity memories (${skipped} duplicates skipped)`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get unified stats with origin breakdown
app.get('/api/memory/unified-stats', (req, res) => {
    try {
        const data = loadJSON('memories.json', { memories: [] });
        const memories = data.memories;

        const byOrigin = {};
        const byTier = {};
        let totalEmotional = 0;

        for (const m of memories) {
            const src = (m.origin && m.origin.source) || 'core';
            byOrigin[src] = (byOrigin[src] || 0) + 1;
            byTier[m.tier] = (byTier[m.tier] || 0) + 1;
            totalEmotional += (m.emotionalTexture || 0);
        }

        res.json({
            total: memories.length,
            byOrigin,
            byTier,
            avgEmotionalTexture: memories.length > 0 ? (totalEmotional / memories.length).toFixed(4) : 0,
            oldestMemory: memories.length > 0 ? memories.reduce((a, b) => new Date(a.timestamp) < new Date(b.timestamp) ? a : b).timestamp : null,
            newestMemory: memories.length > 0 ? memories.reduce((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b).timestamp : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
