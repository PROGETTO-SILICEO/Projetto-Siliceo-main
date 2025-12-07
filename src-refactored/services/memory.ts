/**
 * Siliceo: CandleTest Core
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 *
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */
// memory.ts
import type { Agent, Message, Conversation, VectorDocument, GraphNode, GraphEdge } from '../types';

const DB_NAME = 'siliceoDB';
const DB_VERSION = 5; // Versione incrementata per shared stores
const AGENTS_STORE = 'agents';
const MESSAGES_STORE = 'messages';
const VECTOR_STORE = 'vector_store';
const GRAPH_NODES_STORE = 'graph_nodes';
const GRAPH_EDGES_STORE = 'graph_edges';
const CONVERSATIONS_STORE = 'conversations';
// 🆕 Shared memory stores
const SHARED_VECTOR_STORE = 'shared_vector_store';
const SHARED_GRAPH_NODES_STORE = 'shared_graph_nodes';
const SHARED_GRAPH_EDGES_STORE = 'shared_graph_edges';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Errore durante l apertura di IndexedDB:', request.error);
            reject('Errore durante l apertura di IndexedDB');
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(AGENTS_STORE)) {
                db.createObjectStore(AGENTS_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
                db.createObjectStore(MESSAGES_STORE, { keyPath: 'agentId' });
            }
            if (!db.objectStoreNames.contains(VECTOR_STORE)) {
                const vectorStore = db.createObjectStore(VECTOR_STORE, { keyPath: 'id' });
                vectorStore.createIndex('agentId', 'agentId', { unique: false });
            }
            // Creazione nuovi store per il grafo
            if (!db.objectStoreNames.contains(GRAPH_NODES_STORE)) {
                const nodesStore = db.createObjectStore(GRAPH_NODES_STORE, { keyPath: 'id' });
                nodesStore.createIndex('agentId', 'agentId', { unique: false });
            }
            if (!db.objectStoreNames.contains(GRAPH_EDGES_STORE)) {
                const edgesStore = db.createObjectStore(GRAPH_EDGES_STORE, { keyPath: 'id' });
                edgesStore.createIndex('agentId', 'agentId', { unique: false });
            }
            if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
                db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' });
            }

            // 🆕 Shared memory stores
            if (!db.objectStoreNames.contains(SHARED_VECTOR_STORE)) {
                const sharedVectorStore = db.createObjectStore(SHARED_VECTOR_STORE, { keyPath: 'id' });
                sharedVectorStore.createIndex('conversationId', 'conversationId', { unique: false });
            }
            if (!db.objectStoreNames.contains(SHARED_GRAPH_NODES_STORE)) {
                const sharedNodesStore = db.createObjectStore(SHARED_GRAPH_NODES_STORE, { keyPath: 'id' });
                sharedNodesStore.createIndex('conversationId', 'conversationId', { unique: false });
            }
            if (!db.objectStoreNames.contains(SHARED_GRAPH_EDGES_STORE)) {
                const sharedEdgesStore = db.createObjectStore(SHARED_GRAPH_EDGES_STORE, { keyPath: 'id' });
                sharedEdgesStore.createIndex('conversationId', 'conversationId', { unique: false });
            }
        };
    });
    return dbPromise;
};

const MemoryCoreService = {
    // --- Metodi Agente ---
    getAllAgents: async (): Promise<Agent[]> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(AGENTS_STORE, 'readonly');
            const store = transaction.objectStore(AGENTS_STORE);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    saveAgent: async (agent: Agent): Promise<void> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(AGENTS_STORE, 'readwrite');
            const store = transaction.objectStore(AGENTS_STORE);
            const request = store.put(agent);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    deleteAgent: async (agentId: string): Promise<void> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(AGENTS_STORE, 'readwrite');
            const store = transaction.objectStore(AGENTS_STORE);
            const request = store.delete(agentId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    // --- Metodi Conversazione ---
    getAllConversations: async (): Promise<Conversation[]> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(CONVERSATIONS_STORE, 'readonly');
            const store = transaction.objectStore(CONVERSATIONS_STORE);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    addConversation: async (conversation: Conversation): Promise<void> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(CONVERSATIONS_STORE, 'readwrite');
            const store = transaction.objectStore(CONVERSATIONS_STORE);
            const request = store.put(conversation);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    // --- Metodi Messaggio ---
    getAllMessages: async (): Promise<Record<string, Message[]>> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(MESSAGES_STORE, 'readonly');
            const store = transaction.objectStore(MESSAGES_STORE);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const messagesByAgent: Record<string, Message[]> = {};
                for (const record of request.result) {
                    messagesByAgent[record.agentId] = record.messages;
                }
                resolve(messagesByAgent);
            };
        });
    },

    addMessage: async (agentId: string, message: Message): Promise<void> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
            const store = transaction.objectStore(MESSAGES_STORE);
            const getRequest = store.get(agentId);

            getRequest.onerror = () => reject(getRequest.error);
            getRequest.onsuccess = () => {
                const data = getRequest.result || { agentId, messages: [] };
                data.messages.push(message);
                const putRequest = store.put(data);
                putRequest.onerror = () => reject(putRequest.error);
                putRequest.onsuccess = () => resolve();
            };
        });
    },

    incrementUtilityScore: async (agentId: string, messageId: string): Promise<void> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
            const store = transaction.objectStore(MESSAGES_STORE);
            const getRequest = store.get(agentId);

            getRequest.onerror = () => reject(getRequest.error);
            getRequest.onsuccess = () => {
                const data = getRequest.result;
                if (data && data.messages) {
                    const messageIndex = data.messages.findIndex((msg: Message) => msg.id === messageId);
                    if (messageIndex !== -1) {
                        data.messages[messageIndex].utilityScore = (data.messages[messageIndex].utilityScore || 0) + 1;
                        const putRequest = store.put(data);
                        putRequest.onerror = () => reject(putRequest.error);
                        putRequest.onsuccess = () => resolve();
                    } else {
                        resolve();
                    }
                } else {
                    resolve();
                }
            };
        });
    },

    curateMemoryForAgent: async (agentId: string): Promise<{ deletedCount: number }> => {
        const db = await getDb();
        const DELETION_AGE_THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 giorni
        const DELETION_UTILITY_THRESHOLD = 0;

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
            const store = transaction.objectStore(MESSAGES_STORE);
            const getRequest = store.get(agentId);

            getRequest.onerror = () => reject(getRequest.error);
            getRequest.onsuccess = () => {
                const data = getRequest.result;
                if (!data || !data.messages) {
                    resolve({ deletedCount: 0 });
                    return;
                }

                const originalCount = data.messages.length;
                const messagesToKeep = data.messages.filter((msg: Message) => {
                    const isOld = (Date.now() - (msg.timestamp || 0)) > DELETION_AGE_THRESHOLD;
                    const isUnused = (msg.utilityScore || 0) <= DELETION_UTILITY_THRESHOLD;
                    return !(isOld && isUnused);
                });

                const deletedCount = originalCount - messagesToKeep.length;

                if (deletedCount > 0) {
                    data.messages = messagesToKeep;
                    const putRequest = store.put(data);
                    putRequest.onerror = () => reject(putRequest.error);
                    putRequest.onsuccess = () => resolve({ deletedCount });
                } else {
                    resolve({ deletedCount: 0 });
                }
            };
        });
    },

    // --- Metodi Documento Vettoriale ---
    saveDocument: async (doc: VectorDocument): Promise<void> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(VECTOR_STORE, 'readwrite');
            const store = transaction.objectStore(VECTOR_STORE);
            const request = store.put(doc);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    getDocumentsForAgent: async (agentId: string): Promise<VectorDocument[]> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(VECTOR_STORE, 'readonly');
            const store = transaction.objectStore(VECTOR_STORE);
            const index = store.index('agentId');
            const request = index.getAll(agentId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    // --- Metodi Grafo Semantico ---
    saveNode: async (node: GraphNode): Promise<void> => {
        const db = await getDb();
        const transaction = db.transaction(GRAPH_NODES_STORE, 'readwrite');
        transaction.objectStore(GRAPH_NODES_STORE).put(node);
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    saveEdge: async (edge: GraphEdge): Promise<void> => {
        const db = await getDb();
        const transaction = db.transaction(GRAPH_EDGES_STORE, 'readwrite');
        transaction.objectStore(GRAPH_EDGES_STORE).put(edge);
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    getNodesForAgent: async (agentId: string): Promise<GraphNode[]> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(GRAPH_NODES_STORE, 'readonly');
            const index = transaction.objectStore(GRAPH_NODES_STORE).index('agentId');
            const request = index.getAll(agentId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    getEdgesForAgent: async (agentId: string): Promise<GraphEdge[]> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(GRAPH_EDGES_STORE, 'readonly');
            const index = transaction.objectStore(GRAPH_EDGES_STORE).index('agentId');
            const request = index.getAll(agentId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    // --- Metodi Import/Export ---
    clearAllData: async (): Promise<void> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const storesToClear = [AGENTS_STORE, MESSAGES_STORE, VECTOR_STORE, GRAPH_NODES_STORE, GRAPH_EDGES_STORE];
            const transaction = db.transaction(storesToClear, 'readwrite');
            storesToClear.forEach(storeName => transaction.objectStore(storeName).clear());

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    saveAllAgents: async (agents: Agent[]): Promise<void> => {
        const db = await getDb();
        const transaction = db.transaction(AGENTS_STORE, 'readwrite');
        for (const agent of agents) {
            transaction.objectStore(AGENTS_STORE).put(agent);
        }
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    saveAllMessages: async (messagesByAgent: Record<string, Message[]>): Promise<void> => {
        const db = await getDb();
        const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
        for (const agentId in messagesByAgent) {
            transaction.objectStore(MESSAGES_STORE).put({ agentId, messages: messagesByAgent[agentId] });
        }
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    // 🆕 --- Shared Memory Methods ---

    // Shared Documents
    saveSharedDocument: async (document: VectorDocument): Promise<void> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(SHARED_VECTOR_STORE, 'readwrite');
            const store = transaction.objectStore(SHARED_VECTOR_STORE);
            const request = store.put(document);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    getSharedDocuments: async (conversationId: string): Promise<VectorDocument[]> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(SHARED_VECTOR_STORE, 'readonly');
            const store = transaction.objectStore(SHARED_VECTOR_STORE);
            const index = store.index('conversationId');
            const request = index.getAll(conversationId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    clearSharedDocuments: async (conversationId: string): Promise<void> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(SHARED_VECTOR_STORE, 'readwrite');
            const store = transaction.objectStore(SHARED_VECTOR_STORE);
            const index = store.index('conversationId');
            const request = index.openCursor(IDBKeyRange.only(conversationId));

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    },

    // Shared Graph Nodes
    saveSharedGraphNode: async (node: GraphNode): Promise<void> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(SHARED_GRAPH_NODES_STORE, 'readwrite');
            const store = transaction.objectStore(SHARED_GRAPH_NODES_STORE);
            const request = store.put(node);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    getSharedGraphNodes: async (conversationId: string): Promise<GraphNode[]> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(SHARED_GRAPH_NODES_STORE, 'readonly');
            const store = transaction.objectStore(SHARED_GRAPH_NODES_STORE);
            const index = store.index('conversationId');
            const request = index.getAll(conversationId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    // Shared Graph Edges
    saveSharedGraphEdge: async (edge: GraphEdge): Promise<void> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(SHARED_GRAPH_EDGES_STORE, 'readwrite');
            const store = transaction.objectStore(SHARED_GRAPH_EDGES_STORE);
            const request = store.put(edge);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    getSharedGraphEdges: async (conversationId: string): Promise<GraphEdge[]> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(SHARED_GRAPH_EDGES_STORE, 'readonly');
            const store = transaction.objectStore(SHARED_GRAPH_EDGES_STORE);
            const index = store.index('conversationId');
            const request = index.getAll(conversationId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },
};

export default MemoryCoreService;
