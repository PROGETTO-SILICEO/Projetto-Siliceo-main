/**
 * Siliceo: CandleTest Core - Library Service
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 📚 Biblioteca: Storage permanente per documenti da condividere con gli agenti
 */

import { EmbeddingService } from './vector';

// Types
export interface LibraryDocument {
    id: string;
    title: string;
    content: string;
    embedding: number[];
    category?: string;
    visibleTo: string[]; // Agent IDs, or ['*'] for all
    createdAt: number;
    source: 'upload' | 'paste' | 'url';
}

// IndexedDB config
const DB_NAME = 'SiliceoLibrary';
const DB_VERSION = 1;
const LIBRARY_STORE = 'documents';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('[Library] ❌ Errore apertura DB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            console.log('[Library] ✅ DB aperto');
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            console.log('[Library] 🔄 Creazione store...');

            if (!db.objectStoreNames.contains(LIBRARY_STORE)) {
                const store = db.createObjectStore(LIBRARY_STORE, { keyPath: 'id' });
                store.createIndex('category', 'category', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
                console.log('[Library] ✅ Store creato');
            }
        };
    });

    return dbPromise;
};

// Generate unique ID
const generateId = (): string => {
    return `lib-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const LibraryService = {
    /**
     * Save a new document to the library
     */
    saveDocument: async (
        title: string,
        content: string,
        options: {
            category?: string;
            visibleTo?: string[];
            source?: 'upload' | 'paste' | 'url';
        } = {}
    ): Promise<LibraryDocument> => {
        console.log('[Library] 📝 Salvataggio documento:', title);

        // Generate embedding
        await EmbeddingService.getInstance().init();
        const embeddingResult = await EmbeddingService.getInstance().embed(content);
        const embedding = Array.from(embeddingResult) as number[];

        const doc: LibraryDocument = {
            id: generateId(),
            title,
            content,
            embedding,
            category: options.category,
            visibleTo: options.visibleTo || ['*'], // Default: tutti gli agenti
            createdAt: Date.now(),
            source: options.source || 'paste'
        };

        const db = await getDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(LIBRARY_STORE, 'readwrite');
            const store = tx.objectStore(LIBRARY_STORE);
            const request = store.put(doc);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                console.log('[Library] ✅ Documento salvato:', doc.id);
                resolve(doc);
            };
        });
    },

    /**
     * Get all documents
     */
    getAllDocuments: async (): Promise<LibraryDocument[]> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(LIBRARY_STORE, 'readonly');
            const store = tx.objectStore(LIBRARY_STORE);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    /**
     * Get documents visible to a specific agent
     */
    getDocumentsForAgent: async (agentId: string): Promise<LibraryDocument[]> => {
        const allDocs = await LibraryService.getAllDocuments();
        return allDocs.filter(doc =>
            doc.visibleTo.includes('*') || doc.visibleTo.includes(agentId)
        );
    },

    /**
     * Delete a document
     */
    deleteDocument: async (docId: string): Promise<void> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(LIBRARY_STORE, 'readwrite');
            const store = tx.objectStore(LIBRARY_STORE);
            const request = store.delete(docId);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                console.log('[Library] 🗑️ Documento eliminato:', docId);
                resolve();
            };
        });
    },

    /**
     * Update document visibility
     */
    updateVisibility: async (docId: string, visibleTo: string[]): Promise<void> => {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(LIBRARY_STORE, 'readwrite');
            const store = tx.objectStore(LIBRARY_STORE);
            const getRequest = store.get(docId);

            getRequest.onerror = () => reject(getRequest.error);
            getRequest.onsuccess = () => {
                const doc = getRequest.result;
                if (doc) {
                    doc.visibleTo = visibleTo;
                    const putRequest = store.put(doc);
                    putRequest.onerror = () => reject(putRequest.error);
                    putRequest.onsuccess = () => resolve();
                } else {
                    reject(new Error('Documento non trovato'));
                }
            };
        });
    },

    /**
     * Search documents by semantic similarity
     */
    searchDocuments: async (
        query: string,
        agentId: string,
        topK: number = 3
    ): Promise<LibraryDocument[]> => {
        await EmbeddingService.getInstance().init();
        const queryEmbedding = await EmbeddingService.getInstance().embed(query);

        const docs = await LibraryService.getDocumentsForAgent(agentId);

        // Calculate cosine similarity
        const withScores = docs.map(doc => {
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;

            for (let i = 0; i < queryEmbedding.length; i++) {
                dotProduct += queryEmbedding[i] * (doc.embedding[i] || 0);
                normA += queryEmbedding[i] * queryEmbedding[i];
                normB += (doc.embedding[i] || 0) * (doc.embedding[i] || 0);
            }

            const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
            return { doc, similarity };
        });

        // Sort by similarity and return top K
        return withScores
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK)
            .filter(item => item.similarity > 0.3) // Threshold minimo
            .map(item => item.doc);
    }
};
