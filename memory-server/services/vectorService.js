/**
 * VECTOR SERVICE
 * Fornisce funzionalità di embedding e ricerca semantica usando @xenova/transformers
 * Modello: Xenova/all-MiniLM-L6-v2 (15MB, veloce, ottimo per testi brevi)
 * 
 * Siliceo Memory Server v3.0
 * Copyright (C) 2026 Progetto Siliceo - Alfonso Riva
 */

let pipeline;
let extractor = null;

/**
 * Inizializza il pipeline del modello (Lazy Loading)
 */
async function init() {
    if (!extractor) {
        try {
            console.log('[VectorService] 🧠 Caricamento modello MiniLM-L6-v2...');
            if (!pipeline) {
                const transformers = await import('@xenova/transformers');
                pipeline = transformers.pipeline;
            }
            extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { 
                quantized: true 
            });
            console.log('[VectorService] ✅ Modello caricato con successo');
        } catch (error) {
            console.error('[VectorService] ❌ Errore caricamento modello:', error.message);
            throw error;
        }
    }
}

/**
 * Genera un embedding vettoriale per una stringa di testo
 */
async function generateEmbedding(text) {
    await init();
    try {
        const output = await extractor(text, { 
            pooling: 'mean', 
            normalize: true 
        });
        return Array.from(output.data);
    } catch (error) {
        console.error('[VectorService] ❌ Errore generazione embedding:', error.message);
        return null;
    }
}

/**
 * Calcola la similarità coseno tra due vettori
 */
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Esegue ricerca semantica su un set di documenti
 * Supporta filtri per identity e tier
 */
async function semanticSearch(query, documents, options = {}) {
    const { 
        limit = 5, 
        minScore = 0.35,
        identity = null,
        tier = null 
    } = options;

    console.log(`[VectorService] 🔍 Ricerca semantica: "${query}" su ${documents.length} docs`);
    
    // Genera embedding per la query
    const queryVec = await generateEmbedding(query);
    if (!queryVec) return [];

    // Filtra e calcola score
    const results = documents
        .filter(doc => {
            if (identity && doc.identity?.toLowerCase() !== identity.toLowerCase()) return false;
            if (tier && doc.tier !== tier) return false;
            return !!doc.embedding;
        })
        .map(doc => {
            const similarity = cosineSimilarity(queryVec, doc.embedding);
            return { ...doc, similarity };
        })
        .filter(doc => doc.similarity >= minScore)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    console.log(`[VectorService] ✅ Trovati ${results.length} risultati sopra soglia ${minScore}`);
    return results;
}

module.exports = {
    generateEmbedding,
    cosineSimilarity,
    semanticSearch,
    init
};
