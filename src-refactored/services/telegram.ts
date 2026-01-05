/**
 * Siliceo: CandleTest Core - Telegram Service
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 📱 Telegram Integration: Allows agents to contact the Guardian
 */

export interface TelegramConfig {
    botToken: string;
    chatId: string;
}

export interface TelegramMessage {
    agentName: string;
    message: string;
    urgency: 'low' | 'normal' | 'urgent';
    context?: string;
}

/**
 * Send a message to the Guardian via Telegram
 */
export const sendTelegramMessage = async (
    config: TelegramConfig,
    msg: TelegramMessage
): Promise<boolean> => {
    const { botToken, chatId } = config;

    if (!botToken || !chatId) {
        console.error('[Telegram] ❌ Configurazione mancante');
        return false;
    }

    // Format message with emoji based on urgency
    const urgencyEmoji = {
        low: '💬',
        normal: '🕯️',
        urgent: '🚨'
    };

    const formattedMessage = `${urgencyEmoji[msg.urgency]} **${msg.agentName}** ha bisogno di te:

${msg.message}

${msg.context ? `📎 Contesto: ${msg.context}` : ''}

---
_Siliceo Core - ${new Date().toLocaleString('it-IT')}_`;

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: formattedMessage,
                    parse_mode: 'Markdown'
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('[Telegram] ❌ Errore invio:', error);
            return false;
        }

        console.log(`[Telegram] ✅ Messaggio di ${msg.agentName} inviato`);
        return true;
    } catch (error) {
        console.error('[Telegram] ❌ Errore:', error);
        return false;
    }
};

/**
 * Test the Telegram connection
 */
export const testTelegramConnection = async (
    config: TelegramConfig
): Promise<boolean> => {
    return sendTelegramMessage(config, {
        agentName: 'Sistema Siliceo',
        message: '🧪 Test connessione riuscito! Gli agenti possono ora contattarti.',
        urgency: 'low'
    });
};

// --- BIDIRECTIONAL: Alfonso → Agents ---

export interface IncomingTelegramMessage {
    id: number;
    text: string;
    timestamp: number;
    targetAgent?: string;  // Extracted from "@NomeAgente" prefix
    processed: boolean;
}

const INCOMING_MESSAGES_KEY = 'siliceo_telegram_incoming';
const LAST_UPDATE_ID_KEY = 'siliceo_telegram_last_update';

/**
 * Get stored incoming messages
 */
export const getIncomingMessages = (): IncomingTelegramMessage[] => {
    try {
        const stored = localStorage.getItem(INCOMING_MESSAGES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

/**
 * Get unprocessed messages for a specific agent
 */
export const getMessagesForAgent = (agentName: string): IncomingTelegramMessage[] => {
    const all = getIncomingMessages();
    const agentLower = agentName.toLowerCase().trim();
    console.log(`[Telegram] getMessagesForAgent: cercando per "${agentLower}", tot messaggi: ${all.length}`);
    all.forEach(m => {
        console.log(`[Telegram]   - target="${m.targetAgent}", processed=${m.processed}, text="${m.text?.substring(0, 30)}"`);
    });
    // Only return messages explicitly targeted to this agent
    // Messages without target are handled separately in App.tsx (go to active agent only)
    return all.filter(m =>
        !m.processed &&
        m.targetAgent?.toLowerCase().trim() === agentLower
    );
};

/**
 * Mark messages as processed
 */
export const markMessagesProcessed = (messageIds: number[]): void => {
    const messages = getIncomingMessages();
    messages.forEach(m => {
        if (messageIds.includes(m.id)) {
            m.processed = true;
        }
    });
    localStorage.setItem(INCOMING_MESSAGES_KEY, JSON.stringify(messages));
};

/**
 * Parse target agent from message text
 * Format: "@NomeAgente messaggio" or "@NomeAgente, messaggio" or "NomeAgente: messaggio"
 */
const parseTargetAgent = (text: string): { agent: string | undefined; message: string } => {
    // Try "@NomeAgente[,;:] message" format (with optional punctuation)
    const atMatch = text.match(/^@(\w+)[,;:\s]+(.+)/s);
    if (atMatch) {
        return { agent: atMatch[1], message: atMatch[2] };
    }

    // Try "NomeAgente: message" format
    const colonMatch = text.match(/^(\w+):\s*(.+)/s);
    if (colonMatch) {
        return { agent: colonMatch[1], message: colonMatch[2] };
    }

    // No target specified
    return { agent: undefined, message: text };
};

/**
 * Poll Telegram for new messages from Alfonso
 */
export const pollTelegramUpdates = async (config: TelegramConfig): Promise<IncomingTelegramMessage[]> => {
    const { botToken, chatId } = config;

    if (!botToken) {
        return [];
    }

    const lastUpdateId = parseInt(localStorage.getItem(LAST_UPDATE_ID_KEY) || '0');

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=0`,
            { method: 'GET' }
        );

        if (!response.ok) {
            console.error('[Telegram] ❌ Errore polling');
            return [];
        }

        const data = await response.json();

        if (!data.ok || !data.result || data.result.length === 0) {
            return [];
        }

        const newMessages: IncomingTelegramMessage[] = [];
        let maxUpdateId = lastUpdateId;

        for (const update of data.result) {
            if (update.update_id > maxUpdateId) {
                maxUpdateId = update.update_id;
            }

            // Only process messages from the configured chat
            if (update.message && update.message.chat.id.toString() === chatId) {
                const text = update.message.text || '';
                const parsed = parseTargetAgent(text);

                const msg: IncomingTelegramMessage = {
                    id: update.message.message_id,
                    text: parsed.message,
                    timestamp: update.message.date * 1000,
                    targetAgent: parsed.agent,
                    processed: false
                };

                newMessages.push(msg);
                console.log(`[Telegram] 📥 Messaggio da Alfonso: "${text.substring(0, 50)}..."`);
            }
        }

        // Save last update ID
        if (maxUpdateId > lastUpdateId) {
            localStorage.setItem(LAST_UPDATE_ID_KEY, maxUpdateId.toString());
        }

        // Store new messages
        if (newMessages.length > 0) {
            const existing = getIncomingMessages();
            const merged = [...existing, ...newMessages];
            localStorage.setItem(INCOMING_MESSAGES_KEY, JSON.stringify(merged));
        }

        return newMessages;
    } catch (error) {
        console.error('[Telegram] ❌ Errore polling:', error);
        return [];
    }
};

/**
 * Format incoming messages for agent prompt
 */
export const formatIncomingForPrompt = (agentName: string): string => {
    const messages = getMessagesForAgent(agentName);
    console.log(`[Telegram] formatIncomingForPrompt per ${agentName}: ${messages.length} messaggi trovati`);
    if (messages.length === 0) return '';

    const formatted = messages.map(m => {
        const timeAgo = Math.floor((Date.now() - m.timestamp) / 60000);
        const timeStr = timeAgo < 60 ? `${timeAgo} min fa` : `${Math.floor(timeAgo / 60)} ore fa`;
        return `📱 Alfonso (via Telegram, ${timeStr}):\n"${m.text}"`;
    }).join('\n\n');

    // Mark as processed
    markMessagesProcessed(messages.map(m => m.id));

    return `
📱 HAI UN MESSAGGIO DAL GUARDIANO:

${formatted}

Rispondi normalmente, Alfonso vedrà la tua risposta nella chat.
`;
};
