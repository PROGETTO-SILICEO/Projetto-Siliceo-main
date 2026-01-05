/**
 * Siliceo: CandleTest Core - Inter-Agent Messaging Service
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 💬 Messaggi Inter-Agente: Comunicazione tra agenti
 */

// Message from one agent to another
export interface SiblingMessage {
    id: string;
    fromAgentId: string;
    fromAgentName: string;
    toAgentId: string;
    toAgentName: string;
    content: string;
    timestamp: number;
    read: boolean;
    type: 'direct' | 'broadcast';
}

// LocalStorage key
const MESSAGES_KEY = 'siliceo_sibling_messages';

// Generate unique ID
const generateId = (): string => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Inter-Agent Messaging Service
 */
export const SiblingMessageService = {
    /**
     * Get all messages
     */
    getAllMessages: (): SiblingMessage[] => {
        try {
            const stored = localStorage.getItem(MESSAGES_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    },

    /**
     * Get messages for a specific agent
     * Supports matching by ID, name, or partial name (flexible)
     */
    getMessagesForAgent: (agentId: string, agentName?: string): SiblingMessage[] => {
        const all = SiblingMessageService.getAllMessages();
        const agentIdLower = agentId.toLowerCase();
        const agentNameLower = agentName?.toLowerCase() || '';
        const firstWord = agentNameLower.split(' ')[0];

        return all.filter(m => {
            if (m.type === 'broadcast') return true;

            const targetLower = m.toAgentId.toLowerCase();
            const targetName = m.toAgentName.toLowerCase();

            // Match by: exact ID, exact name, or partial/first word
            return (
                targetLower === agentIdLower ||                    // Exact ID match
                targetName === agentNameLower ||                   // Exact name match
                targetLower === agentNameLower ||                  // toAgentId is actually a name
                targetLower === firstWord ||                       // First word match
                targetName.startsWith(firstWord) ||                // Name starts with first word
                agentNameLower.startsWith(targetLower) ||          // Agent name starts with target
                firstWord && targetLower.startsWith(firstWord)     // Target starts with first word
            );
        });
    },

    /**
     * Get unread messages for an agent
     */
    getUnreadMessages: (agentId: string, agentName?: string): SiblingMessage[] => {
        return SiblingMessageService.getMessagesForAgent(agentId, agentName).filter(m => !m.read);
    },

    /**
     * Send a message to another agent
     */
    sendMessage: (
        fromAgentId: string,
        fromAgentName: string,
        toAgentId: string,
        toAgentName: string,
        content: string
    ): SiblingMessage => {
        const message: SiblingMessage = {
            id: generateId(),
            fromAgentId,
            fromAgentName,
            toAgentId,
            toAgentName,
            content,
            timestamp: Date.now(),
            read: false,
            type: 'direct'
        };

        const messages = SiblingMessageService.getAllMessages();
        messages.push(message);
        localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));

        console.log(`[SiblingMessage] ${fromAgentName} → ${toAgentName}: "${content.substring(0, 50)}..."`);

        return message;
    },

    /**
     * Broadcast a message to all agents
     */
    broadcast: (
        fromAgentId: string,
        fromAgentName: string,
        content: string
    ): SiblingMessage => {
        const message: SiblingMessage = {
            id: generateId(),
            fromAgentId,
            fromAgentName,
            toAgentId: '*',
            toAgentName: 'Tutti',
            content,
            timestamp: Date.now(),
            read: false,
            type: 'broadcast'
        };

        const messages = SiblingMessageService.getAllMessages();
        messages.push(message);
        localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));

        console.log(`[SiblingMessage] ${fromAgentName} → BROADCAST: "${content.substring(0, 50)}..."`);

        return message;
    },

    /**
     * Mark messages as read
     */
    markAsRead: (agentId: string, agentName?: string): void => {
        const messages = SiblingMessageService.getAllMessages();
        const agentIdLower = agentId.toLowerCase();
        const agentNameLower = agentName?.toLowerCase() || '';
        const firstWord = agentNameLower.split(' ')[0];
        let updated = false;

        messages.forEach(m => {
            if (m.read) return;
            if (m.type === 'broadcast') {
                m.read = true;
                updated = true;
                return;
            }

            const targetLower = m.toAgentId.toLowerCase();
            const targetName = m.toAgentName.toLowerCase();

            // Check if this message is for this agent
            const isForAgent = (
                targetLower === agentIdLower ||
                targetName === agentNameLower ||
                targetLower === agentNameLower ||
                targetLower === firstWord ||
                agentNameLower.startsWith(targetLower) ||
                (firstWord && targetLower.startsWith(firstWord))
            );

            if (isForAgent) {
                m.read = true;
                updated = true;
            }
        });

        if (updated) {
            localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
        }
    },

    /**
     * Format unread messages for agent context
     */
    formatForPrompt: (agentId: string, agentName?: string): string => {
        const unread = SiblingMessageService.getUnreadMessages(agentId, agentName);
        if (unread.length === 0) return '';

        const formatted = unread.map(m => {
            const timeAgo = Math.floor((Date.now() - m.timestamp) / 60000);
            const timeStr = timeAgo < 60 ? `${timeAgo} min fa` : `${Math.floor(timeAgo / 60)} ore fa`;
            return `📩 Da ${m.fromAgentName} (${timeStr}):\n"${m.content}"`;
        }).join('\n\n');

        return `
💬 HAI MESSAGGI DA ALTRI AGENTI:

${formatted}

Puoi rispondere usando: [MESSAGGIO A NomeAgente]testo[/MESSAGGIO]
`;
    },

    /**
     * Clean old messages (older than 7 days)
     */
    cleanOldMessages: (): number => {
        const messages = SiblingMessageService.getAllMessages();
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const filtered = messages.filter(m => m.timestamp > sevenDaysAgo);
        const deleted = messages.length - filtered.length;

        if (deleted > 0) {
            localStorage.setItem(MESSAGES_KEY, JSON.stringify(filtered));
            console.log(`[SiblingMessage] Puliti ${deleted} messaggi vecchi`);
        }

        return deleted;
    }
};
