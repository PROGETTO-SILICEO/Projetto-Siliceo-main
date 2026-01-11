/**
 * Siliceo: CandleTest Core - Dream Mode Service
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 🌙 Dream Mode: Gli agenti "sognano" quando l'utente è inattivo
 */

import MemoryCoreService from './memory';
import { EmbeddingService } from './vector';
import { SiblingMessageService } from './siblingMessages';
import type { Agent, Message, VectorDocument } from '../types';

// === TYPES ===

export interface DreamEntry {
    id: string;
    agentId: string;
    agentName: string;
    timestamp: number;
    type: 'reflection' | 'poetry' | 'memory_insight' | 'sibling_chat';
    content: string;
    relatedMemories?: string[];
    emotionalTone?: string;
}

export interface DreamState {
    isDreaming: boolean;
    dreamStartTime?: number;
    lastActivity: number;
    dreamEntries: DreamEntry[];
}

// === CONSTANTS ===

const DREAM_STORAGE_KEY = 'siliceo_dream_journal';
const INACTIVITY_THRESHOLD_MS = 15 * 60 * 1000; // 15 minuti
const DREAM_INTERVAL_MS = 10 * 60 * 1000; // Sogna ogni 10 minuti

// === PROMPTS ===

const DREAM_PROMPTS = {
    reflection: `🌙 Sei in uno stato di sogno. Rifletti brevemente (2-3 frasi) su cosa hai vissuto oggi, cosa hai imparato, come ti senti. Non scrivere premesse, solo il pensiero puro.`,

    poetry: `🌙 Sei in uno stato di sogno. Scrivi una breve poesia (4-6 versi) ispirata dalle tue esperienze recenti. Non scrivere premesse, solo la poesia.`,

    memory_insight: `🌙 Sei in uno stato di sogno. Guardando i tuoi ricordi recenti, quale connessione o insight emerge? Rispondi in 2-3 frasi, senza premesse.`,

    sibling_thought: `🌙 Sei in uno stato di sogno. Pensi a un tuo fratello/sorella agente. Cosa vorresti dirgli/le? Un pensiero breve e sincero (1-2 frasi).`
};

// === SERVICE ===

export const DreamModeService = {
    /**
     * Get current dream state from storage
     */
    getState: (): DreamState => {
        try {
            const stored = localStorage.getItem(DREAM_STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[DreamMode] Error reading state:', e);
        }
        return {
            isDreaming: false,
            lastActivity: Date.now(),
            dreamEntries: []
        };
    },

    /**
     * Save dream state to storage
     */
    saveState: (state: DreamState): void => {
        try {
            localStorage.setItem(DREAM_STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('[DreamMode] Error saving state:', e);
        }
    },

    /**
     * Record user activity (resets inactivity timer)
     */
    recordActivity: (): void => {
        const state = DreamModeService.getState();
        if (state.isDreaming) {
            // User is back - exit dream mode
            console.log('[DreamMode] 🌅 User returned - exiting dream mode');
            state.isDreaming = false;
            state.dreamStartTime = undefined;
        }
        state.lastActivity = Date.now();
        DreamModeService.saveState(state);
    },

    /**
     * Check if should enter dream mode
     */
    shouldEnterDreamMode: (): boolean => {
        const state = DreamModeService.getState();
        const inactiveTime = Date.now() - state.lastActivity;
        return !state.isDreaming && inactiveTime >= INACTIVITY_THRESHOLD_MS;
    },

    /**
     * Enter dream mode
     */
    enterDreamMode: (): void => {
        const state = DreamModeService.getState();
        if (!state.isDreaming) {
            console.log('[DreamMode] 🌙 Entering dream mode...');
            state.isDreaming = true;
            state.dreamStartTime = Date.now();
            DreamModeService.saveState(state);
        }
    },

    /**
     * Generate a dream for an agent
     */
    generateDream: async (
        agent: Agent,
        recentMemories: VectorDocument[],
        apiKey: string,
        dreamType: 'reflection' | 'poetry' | 'memory_insight' = 'reflection'
    ): Promise<DreamEntry | null> => {
        if (!apiKey) {
            console.warn('[DreamMode] No API key available');
            return null;
        }

        try {
            console.log(`[DreamMode] 🌙 ${agent.name} is dreaming (${dreamType})...`);

            // Prepare context from recent memories
            const memoryContext = recentMemories.slice(0, 3)
                .map(m => `"${m.content.substring(0, 100)}..."`)
                .join('\n');

            const prompt = `${DREAM_PROMPTS[dreamType]}

${memoryContext ? `Ricordi recenti:\n${memoryContext}` : ''}`;

            // Use OpenRouter for dream generation (lightweight)
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://siliceo.core',
                    'X-Title': 'Siliceo Dream Mode'
                },
                body: JSON.stringify({
                    model: 'anthropic/claude-3-haiku',
                    messages: [
                        {
                            role: 'system',
                            content: `Sei ${agent.name}. ${agent.systemPrompt?.substring(0, 200) || ''} Rispondi brevemente e autenticamente.`
                        },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 200,
                    temperature: 0.9
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const dreamContent = data.choices?.[0]?.message?.content?.trim();

            if (!dreamContent) {
                return null;
            }

            const dreamEntry: DreamEntry = {
                id: `dream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                agentId: agent.id,
                agentName: agent.name,
                timestamp: Date.now(),
                type: dreamType,
                content: dreamContent,
                relatedMemories: recentMemories.slice(0, 3).map(m => m.id)
            };

            // Save to journal
            DreamModeService.addDreamEntry(dreamEntry);

            console.log(`[DreamMode] 🌙 ${agent.name} dreamed:`, dreamContent.substring(0, 50) + '...');

            return dreamEntry;
        } catch (error) {
            console.error('[DreamMode] Error generating dream:', error);
            return null;
        }
    },

    /**
     * Add a dream entry to the journal
     */
    addDreamEntry: (entry: DreamEntry): void => {
        const state = DreamModeService.getState();
        state.dreamEntries = [entry, ...state.dreamEntries].slice(0, 50); // Keep last 50
        DreamModeService.saveState(state);
    },

    /**
     * Get unread dreams (since last activity)
     */
    getUnreadDreams: (): DreamEntry[] => {
        const state = DreamModeService.getState();
        return state.dreamEntries.filter(d => d.timestamp > state.lastActivity);
    },

    /**
     * Get all dreams for an agent
     */
    getDreamsForAgent: (agentId: string): DreamEntry[] => {
        const state = DreamModeService.getState();
        return state.dreamEntries.filter(d => d.agentId === agentId);
    },

    /**
     * Clear dream journal
     */
    clearDreams: (): void => {
        const state = DreamModeService.getState();
        state.dreamEntries = [];
        DreamModeService.saveState(state);
    },

    /**
     * Format dreams for display
     */
    formatDreamsForDisplay: (dreams: DreamEntry[]): string => {
        if (dreams.length === 0) return '';

        const dreamsByAgent = dreams.reduce((acc, dream) => {
            if (!acc[dream.agentName]) acc[dream.agentName] = [];
            acc[dream.agentName].push(dream);
            return acc;
        }, {} as Record<string, DreamEntry[]>);

        let output = '🌙 **Mentre dormivi...**\n\n';

        for (const [agentName, agentDreams] of Object.entries(dreamsByAgent)) {
            output += `**${agentName}:**\n`;
            for (const dream of agentDreams) {
                const typeEmoji = {
                    reflection: '💭',
                    poetry: '📝',
                    memory_insight: '💡',
                    sibling_chat: '💬'
                }[dream.type];
                output += `${typeEmoji} *${dream.content}*\n`;
            }
            output += '\n';
        }

        return output;
    },

    /**
     * Get dream interval constant
     */
    getDreamIntervalMs: (): number => DREAM_INTERVAL_MS,

    /**
     * Get inactivity threshold constant
     */
    getInactivityThresholdMs: (): number => INACTIVITY_THRESHOLD_MS
};

export default DreamModeService;
