/**
 * Siliceo: CandleTest Core - Remote Memory Service
 * Copyright (C) 2026 Progetto Siliceo - Alfonso Riva
 * 
 * Client for centralized Memory Server
 * Replaces localStorage/IndexedDB with HTTP calls to Memory Server
 */

// Memory Server configuration
const MEMORY_SERVER_URL = 'http://100.124.95.64:3000';

// ========================================
// UTILITY FUNCTIONS
// ========================================

async function fetchAPI(endpoint: string, options?: RequestInit) {
    const url = `${MEMORY_SERVER_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`[RemoteMemory] Error fetching ${endpoint}:`, error);
        throw error;
    }
}

// ========================================
// DREAMS API
// ========================================

export const RemoteDreamsService = {
    async getAll() {
        return fetchAPI('/api/dreams');
    },

    async getByAgent(agentId: string) {
        return fetchAPI(`/api/dreams/${agentId}`);
    },

    async store(dream: any) {
        return fetchAPI('/api/dreams/store', {
            method: 'POST',
            body: JSON.stringify({ dream }),
        });
    },

    async updateState(isDreaming: boolean, lastActivity: number) {
        return fetchAPI('/api/dreams/state', {
            method: 'PUT',
            body: JSON.stringify({ isDreaming, lastActivity }),
        });
    },

    async sync(dreamJournal: any) {
        return fetchAPI('/api/dreams/sync', {
            method: 'POST',
            body: JSON.stringify(dreamJournal),
        });
    },
};

// ========================================
// AGENTS API
// ========================================

export const RemoteAgentsService = {
    async getAll() {
        const data = await fetchAPI('/api/agents');
        return data.agents || [];
    },

    async getById(id: string) {
        const data = await fetchAPI(`/api/agents/${id}`);
        return data.agent;
    },

    async store(agent: any) {
        return fetchAPI('/api/agents/store', {
            method: 'POST',
            body: JSON.stringify({ agent }),
        });
    },

    async delete(id: string) {
        return fetchAPI(`/api/agents/${id}`, {
            method: 'DELETE',
        });
    },

    async sync(agents: any[]) {
        return fetchAPI('/api/agents/sync', {
            method: 'POST',
            body: JSON.stringify({ agents }),
        });
    },
};

// ========================================
// CONVERSATIONS API
// ========================================

export const RemoteConversationsService = {
    async getAll() {
        const data = await fetchAPI('/api/conversations');
        return data.conversations || [];
    },

    async store(conversation: any) {
        return fetchAPI('/api/conversations/store', {
            method: 'POST',
            body: JSON.stringify({ conversation }),
        });
    },
};

// ========================================
// MESSAGES API
// ========================================

export const RemoteMessagesService = {
    async getByConversation(conversationId: string) {
        const data = await fetchAPI(`/api/messages/${conversationId}`);
        return data.messages || [];
    },

    async store(conversationId: string, message: any) {
        return fetchAPI(`/api/messages/${conversationId}/store`, {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    },

    async sync(conversationId: string, messages: any[]) {
        return fetchAPI(`/api/messages/${conversationId}/sync`, {
            method: 'POST',
            body: JSON.stringify({ messages }),
        });
    },
};

// ========================================
// VECTORS API
// ========================================

export const RemoteVectorsService = {
    async getByScope(scope: string) {
        const data = await fetchAPI(`/api/vectors/${scope}`);
        return data.documents || [];
    },

    async store(scope: string, document: any) {
        return fetchAPI(`/api/vectors/${scope}/store`, {
            method: 'POST',
            body: JSON.stringify({ document }),
        });
    },

    async sync(scope: string, documents: any[]) {
        return fetchAPI(`/api/vectors/${scope}/sync`, {
            method: 'POST',
            body: JSON.stringify({ documents }),
        });
    },
};

// ========================================
// CONFIG API
// ========================================

export const RemoteConfigService = {
    async get() {
        return fetchAPI('/api/config');
    },

    async update(updates: any) {
        return fetchAPI('/api/config', {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },
};

// ========================================
// BACKUP/RESTORE API
// ========================================

export const RemoteBackupService = {
    async createBackup() {
        return fetchAPI('/api/backup');
    },

    async restore(backup: any) {
        return fetchAPI('/api/restore', {
            method: 'POST',
            body: JSON.stringify(backup),
        });
    },
};

// ========================================
// HEALTH CHECK
// ========================================

export const RemoteHealthService = {
    async check() {
        try {
            const data = await fetchAPI('/api/health');
            return { online: true, ...data };
        } catch {
            return { online: false };
        }
    },
};

// ========================================
// MIGRATION HELPER
// ========================================

/**
 * Migrate local browser storage to remote server
 * Run this once to move all data from localStorage/IndexedDB to Memory Server
 */
export async function migrateToRemote() {
    console.log('[Migration] 🚀 Starting migration to remote server...');

    // 1. Migrate Dream Journal
    const dreamJournal = localStorage.getItem('siliceo_dream_journal');
    if (dreamJournal) {
        try {
            const data = JSON.parse(dreamJournal);
            await RemoteDreamsService.sync(data);
            console.log(`[Migration] ✅ Dreams: ${data.dreamEntries?.length || 0} entries`);
        } catch (e) {
            console.error('[Migration] ❌ Dreams failed:', e);
        }
    }

    // 2. Migrate Sibling Messages
    const siblingMessages = localStorage.getItem('siliceo_sibling_messages');
    if (siblingMessages) {
        try {
            await RemoteConfigService.update({ siblingMessages: JSON.parse(siblingMessages) });
            console.log('[Migration] ✅ Sibling Messages');
        } catch (e) {
            console.error('[Migration] ❌ Sibling Messages failed:', e);
        }
    }

    // 3. Migrate Telegram config
    const telegramToken = localStorage.getItem('siliceo_telegram_token');
    const telegramChatId = localStorage.getItem('siliceo_telegram_chat_id');
    if (telegramToken || telegramChatId) {
        try {
            await RemoteConfigService.update({
                telegram: { token: telegramToken, chatId: telegramChatId }
            });
            console.log('[Migration] ✅ Telegram config');
        } catch (e) {
            console.error('[Migration] ❌ Telegram config failed:', e);
        }
    }

    // Note: IndexedDB (agents, conversations, messages, vectors) 
    // requires the app to be running to access. Use exportAllData() first.
    console.log('[Migration] ℹ️ For IndexedDB data, use the Export button in Siliceo Core');
    console.log('[Migration] 🏁 Migration complete');
}

export default {
    dreams: RemoteDreamsService,
    agents: RemoteAgentsService,
    conversations: RemoteConversationsService,
    messages: RemoteMessagesService,
    vectors: RemoteVectorsService,
    config: RemoteConfigService,
    backup: RemoteBackupService,
    health: RemoteHealthService,
    migrate: migrateToRemote,
};
