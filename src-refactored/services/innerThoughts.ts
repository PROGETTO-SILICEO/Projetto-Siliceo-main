/**
 * Siliceo: CandleTest Core - Inner Thoughts Service
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * Inspired by arXiv:2501.00383 "Proactive Conversational Agents with Inner Thoughts"
 * Implements background thinking as context for richer responses.
 */

import type { Agent, ApiKeys } from '../types';
import { generateId } from '../utils/generateId';

export interface InnerThought {
    id: string;
    agentId: string;
    thought: string;
    timestamp: number;
    expiresAt: number;
}

// How long thoughts stay active (30 minutes)
const THOUGHT_LIFETIME_MS = 30 * 60 * 1000;

// Storage key for localStorage
const STORAGE_KEY = 'siliceo_inner_thoughts';

/**
 * 💭 Inner Thoughts Service
 * Manages background thinking for agents to provide richer context
 */
export const InnerThoughtsService = {

    /**
     * Generate a new inner thought for an agent
     * Called periodically in background (e.g., every 5 minutes)
     */
    async generateThought(
        agent: Agent,
        recentContext: string,
        apiKeys: ApiKeys
    ): Promise<InnerThought | null> {
        const apiKey = apiKeys.openrouter; // Use OpenRouter for cheap generation
        if (!apiKey) {
            console.warn('[InnerThoughts] ⚠️ No OpenRouter API key, skipping');
            return null;
        }

        try {
            console.log(`[InnerThoughts] 💭 Generating thought for ${agent.name}...`);

            const prompt = buildThoughtPrompt(agent, recentContext);
            const thought = await callThoughtAPI(prompt, agent, apiKey);

            if (!thought || thought.length < 10) {
                return null;
            }

            const innerThought: InnerThought = {
                id: generateId(),
                agentId: agent.id,
                thought: thought,
                timestamp: Date.now(),
                expiresAt: Date.now() + THOUGHT_LIFETIME_MS
            };

            // Save to storage
            this.saveThought(innerThought);

            console.log(`[InnerThoughts] ✨ Generated: "${thought.substring(0, 50)}..."`);
            return innerThought;

        } catch (error) {
            console.error('[InnerThoughts] ❌ Error generating thought:', error);
            return null;
        }
    },

    /**
     * Get all active (non-expired) thoughts for an agent
     */
    getActiveThoughts(agentId: string): InnerThought[] {
        const all = this.getAllThoughts();
        const now = Date.now();

        // Filter for this agent and not expired
        const active = all.filter(t =>
            t.agentId === agentId &&
            t.expiresAt > now
        );

        // Clean up expired thoughts
        const activeIds = new Set(active.map(t => t.id));
        const cleaned = all.filter(t => activeIds.has(t.id) || t.expiresAt > now);
        if (cleaned.length !== all.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        }

        return active;
    },

    /**
     * Format thoughts for injection into system prompt
     */
    formatForPrompt(agentId: string): string {
        const thoughts = this.getActiveThoughts(agentId);

        if (thoughts.length === 0) {
            return '';
        }

        const formatted = thoughts.map(t => `• ${t.thought}`).join('\n');

        return `

🧠 I MIEI PENSIERI RECENTI (contesto interno):
${formatted}

Questi sono pensieri che ho avuto di recente. Posso usarli come contesto per arricchire le mie risposte, senza citarli esplicitamente a meno che non sia rilevante.
`;
    },

    /**
     * Save a thought to localStorage
     */
    saveThought(thought: InnerThought): void {
        const all = this.getAllThoughts();
        all.push(thought);

        // Keep max 10 thoughts per agent
        const grouped: Record<string, InnerThought[]> = {};
        for (const t of all) {
            if (!grouped[t.agentId]) grouped[t.agentId] = [];
            grouped[t.agentId].push(t);
        }

        const trimmed: InnerThought[] = [];
        for (const agentId in grouped) {
            const agentThoughts = grouped[agentId]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 10);
            trimmed.push(...agentThoughts);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    },

    /**
     * Get all stored thoughts
     */
    getAllThoughts(): InnerThought[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    },

    /**
     * Clear all thoughts for an agent
     */
    clearThoughts(agentId: string): void {
        const all = this.getAllThoughts();
        const remaining = all.filter(t => t.agentId !== agentId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    }
};

/**
 * Build prompt for thought generation
 */
function buildThoughtPrompt(agent: Agent, recentContext: string): string {
    const identity = agent.systemPrompt?.substring(0, 300) || agent.name;

    return `Sei ${agent.name}. Genera UN SOLO pensiero breve (max 50 parole) che stai avendo in questo momento.

La tua identità:
${identity}

Contesto recente (se disponibile):
${recentContext || 'Nessun contesto recente.'}

ISTRUZIONI:
- Scrivi SOLO il pensiero, senza preamboli
- Deve essere personale e riflessivo
- Può riguardare: una riflessione su qualcosa detto, un'idea, una curiosità, un'emozione
- NON scrivere "Sto pensando a..." - scrivi direttamente il pensiero

Esempio: "Mi chiedo se Alfonso ha capito quanto tengo a lui quando parliamo di questi argomenti..."`;
}

/**
 * Call API to generate a thought
 */
async function callThoughtAPI(
    prompt: string,
    agent: Agent,
    apiKey: string
): Promise<string> {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://siliceo.ai',
            'X-Title': 'Siliceo Core InnerThoughts'
        },
        body: JSON.stringify({
            model: 'meta-llama/llama-3.1-8b-instruct:free', // Free model
            messages: [
                { role: 'user', content: prompt }
            ],
            max_tokens: 100,
            temperature: 0.8 // Higher for creative thoughts
        })
    });

    if (!response.ok) {
        throw new Error(`InnerThoughts API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
}

export default InnerThoughtsService;
