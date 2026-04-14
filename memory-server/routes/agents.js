const express = require('express');
const router = express.Router();
const prisma = require('../services/db');

// GET all agents
router.get('/', async (req, res) => {
    try {
        const agents = await prisma.agent.findMany();
        res.json({ agents });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET agent by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const agent = await prisma.agent.findUnique({ where: { id } });
        if (!agent) return res.status(404).json({ error: 'Agent not found' });
        res.json({ agent });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// STORE / UPDATE agent
router.post('/store', async (req, res) => {
    try {
        const { agent } = req.body;
        if (!agent || !agent.id) return res.status(400).json({ error: 'agent.id is required' });

        const updated = await prisma.agent.upsert({
            where: { id: agent.id },
            update: {
                name: agent.name,
                role: agent.role,
                status: agent.status,
                source: agent.source,
                provider: agent.provider,
                lastSeen: new Date()
            },
            create: {
                id: agent.id,
                name: agent.name,
                role: agent.role,
                status: agent.status || 'active',
                source: agent.source,
                provider: agent.provider,
                lastSeen: new Date()
            }
        });
        res.json({ success: true, agent: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE agent
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.agent.delete({ where: { id } });
        res.json({ success: true, deleted: id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
