const express = require('express');
const router = express.Router();
const prisma = require('../services/db');

// GET all conversations
router.get('/', async (req, res) => {
    try {
        const conversations = await prisma.conversation.findMany({
            orderBy: { updatedAt: 'desc' }
        });
        res.json({ conversations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET messages for a specific conversation
router.get('/:conversationId/messages', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const messages = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { timestamp: 'asc' }
        });
        res.json({ messages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// STORE / UPDATE conversation
router.post('/store', async (req, res) => {
    try {
        const { conversation } = req.body;
        if (!conversation || !conversation.id) return res.status(400).json({ error: 'conversation.id is required' });

        const stored = await prisma.conversation.upsert({
            where: { id: conversation.id },
            update: {
                name: conversation.name,
                type: conversation.type,
                updatedAt: new Date()
            },
            create: {
                id: conversation.id,
                name: conversation.name,
                type: conversation.type || 'private',
                createdAt: conversation.createdAt ? new Date(conversation.createdAt) : new Date(),
                updatedAt: new Date()
            }
        });
        res.json({ success: true, conversation: stored });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// STORE message
router.post('/:conversationId/messages', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'message object required' });

        const id = message.id || `msg-${Date.now().toString(36)}`;
        
        // Ensure conversation exists
        await prisma.conversation.upsert({
            where: { id: conversationId },
            update: { updatedAt: new Date() },
            create: { id: conversationId, type: 'private', name: `Chat ${conversationId}` }
        });

        const stored = await prisma.message.create({
            data: {
                id,
                conversationId,
                sender: message.sender || 'unknown',
                agentId: message.agentId,
                agentName: message.agentName,
                text: message.text,
                utilityScore: message.utilityScore || 0,
                timestamp: message.timestamp ? new Date(message.timestamp) : new Date()
            }
        });
        res.json({ success: true, message: stored });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
