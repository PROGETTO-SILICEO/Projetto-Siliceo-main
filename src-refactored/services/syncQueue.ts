/**
 * Siliceo: CandleTest Core - Sync Queue Service
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 🔄 Sync Queue: Gestisce la coda di operazioni di sync pendenti
 * con retry automatico e backoff esponenziale
 */

export interface SyncOperation {
    id: string;
    type: 'agent' | 'message' | 'vector' | 'dream';
    endpoint: string;
    data: any;
    timestamp: number;
    retries: number;
}

export interface SyncStatus {
    pending: number;
    processing: boolean;
    oldestOperation?: number;
    lastError?: string;
}

class SyncQueue {
    private queue: SyncOperation[] = [];
    private processing = false;
    private maxRetries = 3;
    private retryDelay = 1000; // 1 secondo base, poi backoff esponenziale
    private processingInterval: number | null = null;

    constructor() {
        this.loadQueue();
        this.startProcessing();
    }

    /**
     * Aggiunge un'operazione alla coda
     */
    enqueue(type: SyncOperation['type'], endpoint: string, data: any): void {
        const operation: SyncOperation = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            endpoint,
            data,
            timestamp: Date.now(),
            retries: 0
        };

        this.queue.push(operation);
        this.saveQueue();
        console.log(`[SyncQueue] ➕ Enqueued ${type} operation (queue size: ${this.queue.length})`);
    }

    /**
     * Avvia il processing loop
     */
    private startProcessing(): void {
        // Process ogni 2 secondi
        this.processingInterval = window.setInterval(async () => {
            await this.processNext();
        }, 2000);
    }

    /**
     * Processa la prossima operazione nella coda
     */
    private async processNext(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const operation = this.queue[0];

        try {
            await this.executeOperation(operation);
            // Successo: rimuovi dalla coda
            this.queue.shift();
            this.saveQueue();
            console.log(`[SyncQueue] ✅ Synced ${operation.type} (${this.queue.length} remaining)`);
        } catch (error) {
            console.error(`[SyncQueue] ❌ Sync failed for ${operation.type}:`, error);
            operation.retries++;

            if (operation.retries >= this.maxRetries) {
                // Max retry raggiunto: rimuovi e logga
                console.warn(`[SyncQueue] ⚠️ Max retries reached for ${operation.id}, removing from queue`);
                this.queue.shift();
                this.saveQueue();
            } else {
                // Retry con backoff esponenziale
                const delay = this.retryDelay * Math.pow(2, operation.retries);
                console.log(`[SyncQueue] 🔄 Retry ${operation.retries}/${this.maxRetries} in ${delay}ms`);
                this.saveQueue();

                // Wait before next attempt
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        } finally {
            this.processing = false;
        }
    }

    /**
     * Esegue un'operazione di sync
     */
    private async executeOperation(op: SyncOperation): Promise<void> {
        const apiKey = localStorage.getItem('siliceo_memory_server_api_key') || '';
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };

        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(op.endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(op.data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
    }

    /**
     * Salva la coda in localStorage
     */
    private saveQueue(): void {
        try {
            localStorage.setItem('siliceo_sync_queue', JSON.stringify(this.queue));
        } catch (e) {
            console.error('[SyncQueue] Failed to save queue:', e);
        }
    }

    /**
     * Carica la coda da localStorage
     */
    private loadQueue(): void {
        try {
            const saved = localStorage.getItem('siliceo_sync_queue');
            if (saved) {
                this.queue = JSON.parse(saved);
                console.log(`[SyncQueue] 📥 Loaded ${this.queue.length} pending operations from storage`);
            }
        } catch (e) {
            console.error('[SyncQueue] Failed to load queue:', e);
            this.queue = [];
        }
    }

    /**
     * Ottieni lo stato corrente della coda
     */
    getStatus(): SyncStatus {
        return {
            pending: this.queue.length,
            processing: this.processing,
            oldestOperation: this.queue[0]?.timestamp,
            lastError: undefined // TODO: track last error
        };
    }

    /**
     * Pulisci la coda (per testing/debug)
     */
    clearQueue(): void {
        this.queue = [];
        this.saveQueue();
        console.log('[SyncQueue] 🗑️ Queue cleared');
    }

    /**
     * Ferma il processing (cleanup)
     */
    stop(): void {
        if (this.processingInterval !== null) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
    }
}

// Singleton instance
export const syncQueue = new SyncQueue();

export default syncQueue;
