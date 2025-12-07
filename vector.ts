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
// vector.ts
import { pipeline as p } from '@xenova/transformers';

// NOTA: Le impostazioni dell'ambiente (env) sono ora configurate a livello globale in App.tsx
// per garantire che vengano applicate prima dell'inizializzazione di qualsiasi parte della libreria.
// Questo previene errori di avvio quando si esegue l'app da un file locale.

let pipeline: Function | null = null;
let captioner: Function | null = null;

class EmbeddingService {
    private static instance: EmbeddingService | null = null;
    private modelPromise: Promise<[void, void]> | null = null;
    private embeddingModel = 'Xenova/all-MiniLM-L6-v2';
    private captioningModel = 'Xenova/vit-gpt2-image-captioning';

    private constructor() {}

    public static getInstance(): EmbeddingService {
        if (!EmbeddingService.instance) {
            EmbeddingService.instance = new EmbeddingService();
        }
        return EmbeddingService.instance;
    }

    public async init(): Promise<[void, void]> {
        if (!this.modelPromise) {
            this.modelPromise = Promise.all([
                new Promise(async (resolve, reject) => {
                    try {
                        pipeline = await p('feature-extraction', this.embeddingModel, { quantized: true });
                        console.log("Modello di embedding caricato con successo.");
                        resolve();
                    } catch (error) {
                        console.error("Errore durante il caricamento del modello di embedding:", error);
                        reject(error);
                    }
                }),
                new Promise(async (resolve, reject) => {
                    try {
                        captioner = await p('image-to-text', this.captioningModel, { quantized: true });
                        console.log("Modello di captioning caricato con successo.");
                        resolve();
                    } catch (error) {
                        console.error("Errore durante il caricamento del modello di captioning:", error);
                        reject(error);
                    }
                })
            ]);
        }
        return this.modelPromise;
    }

    public async embed(text: string): Promise<Float32Array> {
        if (!pipeline) {
            throw new Error("Il modello di embedding non è ancora stato inizializzato. Chiamare init() prima.");
        }
        // Normalizza il testo e lo limita per sicurezza
        const cleanText = text.replace(/\\n/g, ' ').trim();
        const output = await pipeline(cleanText, {
            pooling: 'mean',
            normalize: true,
        });

        return output.data;
    }

    public static cosineSimilarity(vecA: number[] | Float32Array, vecB: number[] | Float32Array): number {
        let dotProduct = 0.0;
        let normA = 0.0;
        let normB = 0.0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) {
            return 0; // Evita la divisione per zero
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    public findMostSimilarDocuments<T extends { embedding: Float32Array }>(
        queryEmbedding: Float32Array,
        documents: T[],
        topN: number = 2
    ): T[] {
        if (documents.length === 0) {
            return [];
        }

        const scoredDocuments = documents.map(doc => ({
            ...doc,
            similarity: EmbeddingService.cosineSimilarity(queryEmbedding, doc.embedding)
        }));

        scoredDocuments.sort((a, b) => b.similarity - a.similarity);

        return scoredDocuments.slice(0, topN);
    }

    public async generateImageCaption(imageUrl: string): Promise<string> {
        if (!captioner) {
            throw new Error("Il modello di captioning non è ancora stato inizializzato. Chiamare init() prima.");
        }
        try {
            const result = await captioner(imageUrl);
            // Il risultato è un array, prendiamo il primo elemento.
            return result[0].generated_text;
        } catch (error) {
            console.error("Errore durante la generazione della caption:", error);
            // Restituisce una stringa di errore gestibile dall'applicazione
            return "Impossibile generare una descrizione per l'immagine.";
        }
    }
}

export { EmbeddingService };