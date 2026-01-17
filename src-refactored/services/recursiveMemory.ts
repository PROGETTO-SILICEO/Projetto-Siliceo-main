/**
 * Siliceo: CandleTest Core
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 *
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * recursiveMemory.ts - Infinite Context Memory Manager
 * Uses the Memory Server API for tiered, persistent storage
 */

// Memory Server configuration
const MEMORY_SERVER_URL = 'http://100.124.95.64:3000';

// Memory tiers
export type MemoryTier = 'core' | 'context_summary' | 'external';

export interface Memory {
    id: string;
    tier: MemoryTier;
    content: string;
    metadata: {
        source?: string;
        date?: string;
        agentId?: string;
        conversationId?: string;
        [key: string]: string | undefined;
    };
    timestamp: string;
}

export interface MemoryStoreRequest {
    tier: MemoryTier;
    content: string;
    metadata?: Record<string, string>;
}

export interface MemoryRetrieveResponse {
    query: string;
    count: number;
    memories: Memory[];
}

/**
 * RecursiveMemoryService
 * 
 * Provides tiered memory management using the Memory Server:
 * - Core: Essential facts that should always be in context
 * - Context Summary: Compressed summaries of old conversations
 * - External: Full archive of all memories
 */
const RecursiveMemoryService = {
    /**
     * Check if Memory Server is available
     */
    isAvailable: async (): Promise<boolean> => {
        try {
            const response = await fetch(`${MEMORY_SERVER_URL}/api/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch {
            return false;
        }
    },

    /**
     * Store a memory to the specified tier
     */
    store: async (request: MemoryStoreRequest): Promise<Memory | null> => {
        try {
            const response = await fetch(`${MEMORY_SERVER_URL}/api/memory/store`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                console.error('[RecursiveMemory] Store failed:', await response.text());
                return null;
            }

            const result = await response.json();
            return result.memory;
        } catch (error) {
            console.error('[RecursiveMemory] Store error:', error);
            return null;
        }
    },

    /**
     * Retrieve memories matching a query
     */
    retrieve: async (query: string, tier?: MemoryTier, limit?: number): Promise<Memory[]> => {
        try {
            const params = new URLSearchParams();
            if (query) params.set('q', query);
            if (tier) params.set('tier', tier);
            if (limit) params.set('limit', limit.toString());

            const response = await fetch(`${MEMORY_SERVER_URL}/api/memory/retrieve?${params}`);

            if (!response.ok) {
                console.error('[RecursiveMemory] Retrieve failed:', await response.text());
                return [];
            }

            const result: MemoryRetrieveResponse = await response.json();
            return result.memories;
        } catch (error) {
            console.error('[RecursiveMemory] Retrieve error:', error);
            return [];
        }
    },

    /**
     * Get all core memories (for context injection)
     */
    getCoreMemories: async (): Promise<Memory[]> => {
        try {
            const response = await fetch(`${MEMORY_SERVER_URL}/api/memory/core`);
            if (!response.ok) return [];
            const result = await response.json();
            return result.core || [];
        } catch (error) {
            console.error('[RecursiveMemory] Get core error:', error);
            return [];
        }
    },

    /**
     * Store a core fact (always kept in context)
     */
    storeCoreFact: async (content: string, agentId?: string): Promise<Memory | null> => {
        return RecursiveMemoryService.store({
            tier: 'core',
            content,
            metadata: {
                source: 'core_fact',
                date: new Date().toISOString().split('T')[0],
                agentId: agentId || 'system'
            }
        });
    },

    /**
     * Store a context summary (compressed old conversations)
     */
    storeContextSummary: async (summary: string, conversationId: string): Promise<Memory | null> => {
        return RecursiveMemoryService.store({
            tier: 'context_summary',
            content: summary,
            metadata: {
                source: 'context_compression',
                date: new Date().toISOString().split('T')[0],
                conversationId
            }
        });
    },

    /**
     * Store an external memory (full archive)
     */
    storeExternal: async (content: string, metadata?: Record<string, string>): Promise<Memory | null> => {
        return RecursiveMemoryService.store({
            tier: 'external',
            content,
            metadata: {
                source: 'conversation',
                date: new Date().toISOString().split('T')[0],
                ...metadata
            }
        });
    },

    /**
     * Build context injection string from core memories
     * Returns a formatted string to prepend to the system prompt
     */
    buildCoreContext: async (): Promise<string> => {
        const coreMemories = await RecursiveMemoryService.getCoreMemories();

        if (coreMemories.length === 0) {
            return '';
        }

        const formattedMemories = coreMemories
            .map(m => `- ${m.content}`)
            .join('\n');

        return `\n## Core Memories (Always Remember)\n${formattedMemories}\n`;
    },

    /**
     * Search documents on Memory Server (diaries, philosophy, etc.)
     */
    searchDocuments: async (query: string): Promise<{ file: string; matches: string[] }[]> => {
        try {
            const response = await fetch(`${MEMORY_SERVER_URL}/api/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) return [];
            const result = await response.json();
            return result.results || [];
        } catch (error) {
            console.error('[RecursiveMemory] Search docs error:', error);
            return [];
        }
    }
};

export default RecursiveMemoryService;
