/**
 * Siliceo: CandleTest Core
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 *
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * summarizer.ts - Recursive Context Summarization
 * Compresses old messages to make room for new context
 */

import type { Message } from '../types';
import { generateId } from '../utils/generateId';

// Configuration
const MAX_CONTEXT_TOKENS = 8000; // Approximate token limit for context
const COMPRESSION_THRESHOLD = 0.8; // Compress when context is 80% full
const CHARS_PER_TOKEN = 4; // Rough estimate

/**
 * Estimate token count from text
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimate total tokens in a message array
 */
export function estimateMessagesTokens(messages: Message[]): number {
    return messages.reduce((sum, msg) => {
        return sum + estimateTokens(msg.text || '');
    }, 0);
}

/**
 * Check if context compression is needed
 */
export function needsCompression(messages: Message[]): boolean {
    const currentTokens = estimateMessagesTokens(messages);
    return currentTokens > MAX_CONTEXT_TOKENS * COMPRESSION_THRESHOLD;
}

/**
 * Split messages into keep (recent) and compress (old)
 * Keeps the newest 50% of messages, compresses the oldest 50%
 */
export function splitForCompression(messages: Message[]): {
    toKeep: Message[];
    toCompress: Message[];
} {
    const midpoint = Math.floor(messages.length / 2);
    return {
        toCompress: messages.slice(0, midpoint),
        toKeep: messages.slice(midpoint)
    };
}

/**
 * Build a summarization prompt for the LLM
 */
export function buildSummarizationPrompt(messages: Message[]): string {
    const conversationText = messages
        .map(m => {
            const role = m.sender === 'user' ? 'Utente' : m.agentName || 'Assistente';
            return `${role}: ${m.text || ''}`;
        })
        .join('\n\n');

    return `Riassumi questa conversazione in modo conciso ma preservando tutti i fatti importanti, le decisioni prese, e il contesto emotivo. Il riassunto sarà usato per mantenere la continuità della conversazione.

CONVERSAZIONE DA RIASSUMERE:
---
${conversationText}
---

RIASSUNTO (max 500 parole):`;
}

/**
 * Create a system message containing the summary
 */
export function createSummaryMessage(summary: string, originalCount: number): Message {
    return {
        id: generateId(),
        sender: 'ai',
        text: `[RIASSUNTO DI ${originalCount} MESSAGGI PRECEDENTI]\n\n${summary}\n\n[FINE RIASSUNTO - La conversazione continua...]`,
        agentName: 'System',
        timestamp: Date.now(),
        utilityScore: 0
    };
}

/**
 * SummarizerService
 * 
 * Manages context compression through recursive summarization.
 * When context gets too long, older messages are summarized
 * and the summary replaces them.
 */
const SummarizerService = {
    /**
     * Check and optionally compress context
     * Returns the new message array (compressed or original)
     */
    checkAndCompress: async (
        messages: Message[],
        callLLM: (prompt: string) => Promise<string>
    ): Promise<{
        messages: Message[];
        wasCompressed: boolean;
        summary?: string;
    }> => {
        if (!needsCompression(messages)) {
            return { messages, wasCompressed: false };
        }

        console.log('[Summarizer] Context compression triggered');

        const { toKeep, toCompress } = splitForCompression(messages);

        if (toCompress.length < 4) {
            // Not enough messages to compress
            return { messages, wasCompressed: false };
        }

        try {
            const prompt = buildSummarizationPrompt(toCompress);
            const summary = await callLLM(prompt);

            const summaryMessage = createSummaryMessage(summary, toCompress.length);
            const newMessages = [summaryMessage, ...toKeep];

            console.log(`[Summarizer] Compressed ${toCompress.length} messages into summary`);

            return {
                messages: newMessages,
                wasCompressed: true,
                summary
            };
        } catch (error) {
            console.error('[Summarizer] Compression failed:', error);
            return { messages, wasCompressed: false };
        }
    },

    /**
     * Force compression regardless of threshold
     */
    forceCompress: async (
        messages: Message[],
        callLLM: (prompt: string) => Promise<string>
    ): Promise<{
        messages: Message[];
        summary: string;
    }> => {
        const { toKeep, toCompress } = splitForCompression(messages);

        const prompt = buildSummarizationPrompt(toCompress);
        const summary = await callLLM(prompt);

        const summaryMessage = createSummaryMessage(summary, toCompress.length);

        return {
            messages: [summaryMessage, ...toKeep],
            summary
        };
    },

    // Exposed utilities
    estimateTokens,
    estimateMessagesTokens,
    needsCompression,
    buildSummarizationPrompt
};

export default SummarizerService;
