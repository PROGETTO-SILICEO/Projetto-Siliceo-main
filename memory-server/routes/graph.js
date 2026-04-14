const express = require('express');
const router = express.Router();
const graphService = require('../services/graphService');

// GET full graph
router.get('/', async (req, res) => {
    try {
        const graph = await graphService.loadGraph();
        res.json(graph);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SYNC graph (bulk update)
router.post('/sync', async (req, res) => {
    try {
        const { nodes, edges } = req.body;
        // La logica di sync intensiva può restare nel service
        await graphService.syncGraph(nodes, edges);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
