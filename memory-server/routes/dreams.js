const express = require('express');
const router = express.Router();
const prisma = require('../services/db');

// GET all dreams
router.get('/', async (req, res) => {
    try {
        const dreamEntries = await prisma.dream.findMany({
            orderBy: { timestamp: 'desc' },
            take: 100
        });
        res.json({ dreamEntries });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET dreams by agent
router.get('/:agentId', async (req, res) => {
    try {
        const { agentId } = req.params;
        const dreams = await prisma.dream.findMany({
            where: { agentId },
            orderBy: { timestamp: 'desc' }
        });
        res.json({ dreams });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// STORE dream
router.post('/store', async (req, res) => {
    try {
        const { dream } = req.body;
        if (!dream) return res.status(400).json({ error: 'dream object required' });

        const id = dream.id || `dream-${Date.now().toString(36)}`;
        const stored = await prisma.dream.create({
            data: {
                id,
                agentId: dream.agentId,
                agentName: dream.agentName,
                type: dream.type || 'reflection',
                content: dream.content,
                relatedMemories: dream.relatedMemories ? JSON.stringify(dream.relatedMemories) : null,
                timestamp: dream.timestamp ? new Date(dream.timestamp) : new Date()
            }
        });
        res.json({ success: true, dream: stored });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
