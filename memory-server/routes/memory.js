const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const vectorService = require('../services/vectorService');
const temporalCurator = require('../services/temporalCurator');
const tribunaleInterno = require('../services/tribunaleInterno');
const graphDiscovery = require('../services/graphDiscovery');
const { runIndexing } = require('../scripts/index-memories');

function parseMemoryRecord(memory) {
    let embedding = null;
    let metadata = {};

    try {
        embedding = memory.embedding ? JSON.parse(memory.embedding) : null;
    } catch (e) {
        embedding = null;
    }

    try {
        metadata = memory.metadata ? JSON.parse(memory.metadata) : {};
    } catch (e) {
        metadata = {};
    }

    return {
        ...memory,
        embedding,
        metadata
    };
}

// 0. RETRIEVE (Legacy-compatible retrieval endpoint)
router.get('/retrieve', async (req, res) => {
    try {
        const { q, tier, identity, semantic = 'false', recent = 'false' } = req.query;
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);

        const where = {};
        if (tier) where.tier = tier;

        if (identity) {
            where.OR = [
                { identity: { contains: identity } },
                { source: { contains: identity } },
                { metadata: { contains: identity } }
            ];
        }

        // Se recent è true, ignoriamo la ricerca testuale e prendiamo gli ultimi record
        if (recent === 'true') {
            const memories = await prisma.memory.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                take: limit
            });
            return res.json({
                query: 'recent_history',
                count: memories.length,
                memories: memories.map(parseMemoryRecord)
            });
        }

        if (q && semantic !== 'true') {
            where.content = { contains: q };
        }

        const memories = await prisma.memory.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: semantic === 'true' ? limit * 10 : limit
        });

        let formatted = memories.map(parseMemoryRecord);

        if (semantic === 'true' && q) {
            formatted = await vectorService.semanticSearch(q, formatted, {
                limit,
                tier: tier || null,
                identity: identity || null
            });
        }

        res.json({
            query: q || null,
            count: formatted.length,
            memories: formatted.slice(0, limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 1. SEARCH (Semantic RAG)
router.post('/search', async (req, res) => {
    try {
        const { query, limit, tier } = req.body;
        if (!query) return res.status(400).json({ error: 'Query is required' });
        
        // Fix (v3.1.2): Carichiamo le memorie dal DB per passarle al vectorizer
        const memories = await prisma.memory.findMany({
            where: {
                embedding: { not: null },
                ...(tier ? { tier } : {})
            }
        });

        // Parsiamo gli embedding serializzati
        const documents = memories.reduce((acc, m) => {
            try {
                acc.push({
                    ...m,
                    embedding: JSON.parse(m.embedding)
                });
            } catch (e) {
                console.warn(`⚠️ [Search] Salto memoria ${m.id}: JSON embedding corrotto.`);
            }
            return acc;
        }, []);

        const results = await vectorService.semanticSearch(query, documents, { limit: limit || 5 });
        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. TRIGGER INDEXING
router.get('/index', async (req, res) => {
    try {
        const stats = await runIndexing();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. TRIGGER TEMPORAL CURATION
router.post('/temporal-decay', async (req, res) => {
    try {
        const stats = await temporalCurator.runTemporalCuration();
        res.json({ success: true, ...stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. STORE (Pipeline Completa)
router.post('/store', async (req, res) => {
    try {
        const { content, tier, source, identity, metadata } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required' });

        // Phase A: Candle Test (Tribunale Interno)
        // Fix (v3.1.2): shouldSave restituisce un booleano puro
        const allowed = await tribunaleInterno.shouldSave(content, tier || 'working');
        if (!allowed) {
            return res.status(403).json({ 
                error: 'Censure: Content violates safety patterns (Candle Test)'
            });
        }

        // Phase B: Vector Generation
        const embedding = await vectorService.generateEmbedding(content);

        // Phase C: SQL Storage
        const memory = await prisma.memory.create({
            data: {
                content,
                tier: tier || 'working',
                source,
                identity,
                embedding: embedding ? JSON.stringify(embedding) : null,
                metadata: metadata ? JSON.stringify(metadata) : null,
                emotionalTexture: 1.0,
                temporalLayer: 'recent'
            }
        });

        // Phase D: Graph Discovery (Asincrono)
        graphDiscovery.processMemory(memory).catch(err => {
            console.error('⚠️ [Discovery Error]', err.message);
        });

        res.json({ success: true, memory });
    } catch (error) {
        console.error('❌ [Store Error]', error);
        res.status(500).json({ error: error.message });
    }
});

// 5. STATS (Frontend Dashboard)
router.get('/stats', async (req, res) => {
    try {
        const total = await prisma.memory.count();
        const core = await prisma.memory.count({ where: { tier: 'core' } });
        res.json({ total, core });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. LIBRARY (Frontend)
router.get('/library', async (req, res) => {
    try {
        const docs = await prisma.memory.findMany({
            where: { tier: 'permanent' },
            select: { id: true, source: true, content: true, timestamp: true },
            orderBy: { timestamp: 'desc' },
            take: 50
        });
        
        const formatted = docs.map(d => ({
            id: d.id,
            filename: d.source || `Documento_${d.id}`,
            size: Buffer.byteLength(d.content || '', 'utf8'),
            updatedAt: d.timestamp,
            snippet: d.content.substring(0, 50) + '...'
        }));
        res.json({ files: formatted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/library/upload', async (req, res) => {
    try {
        const { filename, content } = req.body;
        if (!content) return res.status(400).json({ error: 'Content required' });
        
        const embedding = await vectorService.generateEmbedding(content);
        const memory = await prisma.memory.create({
            data: {
                content,
                tier: 'permanent',
                source: filename,
                identity: 'imported',
                embedding: embedding ? JSON.stringify(embedding) : null,
                emotionalTexture: 1.0,
                temporalLayer: 'recent'
            }
        });
        
        graphDiscovery.processMemory(memory).catch(err => console.error(err));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/library/:filename', async (req, res) => {
    try {
        await prisma.memory.deleteMany({
            where: { source: req.params.filename, tier: 'permanent' }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. TRIBUNALE (Frontend Legacy Route Map)
const tribunaleHistoryService = require('../services/tribunaleHistory');

router.get('/tribunale/history', async (req, res) => {
    try {
        const cases = await tribunaleHistoryService.getHistory();
        res.json({ cases });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/tribunale/resolve', async (req, res) => {
    try {
        const { caseId, verdict, status } = req.body;
        const finalVerdict = verdict || status;
        if (!caseId || !finalVerdict) {
            return res.status(400).json({ error: 'caseId and verdict required' });
        }

        const updatedCase = await tribunaleHistoryService.resolveCase(caseId, finalVerdict);
        if (!updatedCase) {
            return res.status(404).json({ error: 'case not found' });
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 8. TRIBUNALE EVALUATE — valuta senza salvare (per sogni e contenuti pre-salvataggio)
// Usato dal daemon Python per ottenere un verdetto PRIMA di salvare il sogno
router.post('/tribunale/evaluate', async (req, res) => {
    try {
        const { content, tier = 'working', useLLM = false } = req.body;
        if (!content) return res.status(400).json({ error: 'content required' });

        const result = await tribunaleInterno.candleTest(content, useLLM);

        res.json({
            verdict: result.verdict,      // LIGHT | NEUTRAL | BURN
            method: result.method,        // pattern | llm
            reasoning: result.reasoning,
            confidence: result.confidence,
            shouldSave: result.verdict !== 'BURN'
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
