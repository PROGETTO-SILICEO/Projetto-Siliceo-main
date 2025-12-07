/**
 * Siliceo: CandleTest Core
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 *
 * This file is part of Siliceo.
 *
 * Siliceo is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Siliceo is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Siliceo. If not, see <https://www.gnu.org/licenses/>.
 */
// memory.ts

// --- TIPI DI DATI (Duplicati da App.tsx per un servizio autonomo) ---
export type Provider = 'google' | 'openrouter' | 'anthropic' | 'other';
export type Agent = {
  id: string;
  name: string;
  provider: Provider;
  model: string;
  historySize: number;
};
export type Attachment = {
  name: string;
  type: 'image' | 'text';
  content: string; // Base64 per immagine, testo grezzo per testo
};
export type Message = {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  agentName: string;
  timestamp: number;
  utilityScore: number;
  attachment?: Attachment;
  agentId?: string; // Optional for backward compatibility
};
export type Conversation = {
  id: string;
  name: string;
  type: 'common' | 'private';
  participantIds: string[];
  createdAt: number;
  lastActivity: number;
};

// Nuovo tipo per i documenti vettorizzati
export type VectorDocument = {
  id: string;
  agentId: string;
  name: string;
  content: string;
  embedding: Float32Array;
  utilityScore: number;
  timestamp: number;
};

// --- Tipi di dati per il Grafo ---
export type GraphNode = {
  id: string;      // UUID univoco per il nodo
  agentId: string; // A quale agente appartiene questo nodo
  label: string;   // Il testo dell'entità (es. "Alfonso", "Progetto Siliceo")
  type: string;    // Il tipo di entità (es. "PERSONA", "PROGETTO")
};

export type GraphEdge = {
  id: string;      // UUID univoco per l'arco
  agentId: string; // A quale agente appartiene questo arco
  source: string;  // ID del nodo di partenza
  target: string;  // ID del nodo di arrivo
  label: string;   // Descrizione della relazione (es. "ha scritto", "è parte di")
};


const DB_NAME = 'siliceoDB';
const DB_VERSION = 4; // Versione incrementata per gli store del grafo
const AGENTS_STORE = 'agents';
const MESSAGES_STORE = 'messages';
const VECTOR_STORE = 'vector_store';
const GRAPH_NODES_STORE = 'graph_nodes'; // Nuovo store per i nodi del grafo
const GRAPH_EDGES_STORE = 'graph_edges'; // Nuovo store per gli archi del grafo
const CONVERSATIONS_STORE = 'conversations'; // Nuovo store per le conversazioni

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
  }
};

export default MemoryCoreService;
