/**
 * TEMPORAL CURATOR
 * Gestisce il decay emotivo dei ricordi basato sul tempo
 * Implementa tre epoche temporali: founding, present, recent
 * 
 * Siliceo Memory Server v3.0
 * Copyright (C) 2026 Progetto Siliceo - Alfonso Riva
 */

// === CONFIG ===

const DECAY_CONFIG = {
    founding: {
        threshold: 180,      // > 180 giorni
        halfLife: 180,       // la texture dimezza in 180 giorni
        minTexture: 0.3      // mai sotto 0.3 (ricordi fondativi)
    },
    present: {
        threshold: 30,       // 30-180 giorni
        halfLife: 90,
        minTexture: 0.2
    },
    recent: {
        threshold: 0,        // 0-30 giorni
        halfLife: 30,
        minTexture: 0.1
    }
};

// === FUNCTIONS ===

/**
 * Classifica un documento in base all'età
 */
function classifyTemporalLayer(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));

    if (days > DECAY_CONFIG.founding.threshold) return 'founding';
    if (days > DECAY_CONFIG.present.threshold) return 'present';
    return 'recent';
}

/**
 * Calcola la texture emotiva con decay esponenziale
 * Formula: texture = texture_0 * e^(-λt)
 * dove λ = ln(2) / halfLife
 */
function calculateEmotionalDecay(currentTexture, daysSinceCreation, layer) {
    const config = DECAY_CONFIG[layer];
    const lambda = Math.LN2 / config.halfLife;
    const decayed = currentTexture * Math.exp(-lambda * daysSinceCreation);
    return Math.max(decayed, config.minTexture);
}

/**
 * Applica decay emotivo a un singolo documento
 */
function applyDecayToDocument(doc) {
    const createdAt = doc.timestamp || doc.createdAt || Date.now();
    const created = new Date(createdAt);
    const now = new Date();
    const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));

    const layer = classifyTemporalLayer(createdAt);
    const currentTexture = doc.emotionalTexture !== undefined ? doc.emotionalTexture : 1.0;
    const newTexture = calculateEmotionalDecay(currentTexture, days, layer);

    return {
        ...doc,
        temporalLayer: layer,
        emotionalTexture: newTexture,
        lastDecayUpdate: Date.now()
    };
}

/**
 * Applica decay a tutti i documenti
 */
function applyEmotionalDecay(documents) {
    let updated = 0;

    const result = documents.map(doc => {
        const decayed = applyDecayToDocument(doc);

        // Conta solo se c'è stata una modifica significativa
        const oldTexture = doc.emotionalTexture || 1.0;
        if (Math.abs(decayed.emotionalTexture - oldTexture) > 0.01) {
            updated++;
        }

        return decayed;
    });

    return { documents: result, updated };
}

/**
 * Genera statistiche sui layer temporali
 */
function getTemporalStats(documents) {
    const stats = {
        founding: { count: 0, totalTexture: 0, avgTexture: 0 },
        present: { count: 0, totalTexture: 0, avgTexture: 0 },
        recent: { count: 0, totalTexture: 0, avgTexture: 0 },
        total: documents.length
    };

    documents.forEach(doc => {
        const layer = doc.temporalLayer || classifyTemporalLayer(doc.timestamp || Date.now());
        const texture = doc.emotionalTexture || 1.0;

        stats[layer].count++;
        stats[layer].totalTexture += texture;
    });

    // Calcola medie
    ['founding', 'present', 'recent'].forEach(layer => {
        if (stats[layer].count > 0) {
            stats[layer].avgTexture = stats[layer].totalTexture / stats[layer].count;
        }
    });

    return stats;
}

/**
 * Filtra documenti per layer (utile per RAG)
 * In chat quotidiana, limita ricordi mythic/founding
 */
function filterByContext(documents, context = 'daily_chat') {
    if (context === 'deep_reflection' || context === 'autopoiesis') {
        return documents; // Tutti i layer
    }

    // daily_chat: limita ricordi founding troppo vividi
    return documents.filter(doc => {
        if (doc.temporalLayer === 'founding') {
            // Founding con texture > 0.5 = troppo vivido per chat quotidiana
            return (doc.emotionalTexture || 0.3) <= 0.5;
        }
        return true;
    });
}

// === EXPORT ===

const prisma = require('./db');

// ... (existing DECAY_CONFIG)

/**
 * Funzione di orchestrazione per il job di decadimento temporale
 * Esegue il decay su tutte le memorie nel DB e restituisce statistiche
 */
async function runTemporalCuration() {
    const startTime = Date.now();
    console.log('⏳ [Curation] Avvio decadimento temporale SQL...');
    
    try {
        const memories = await prisma.memory.findMany();
        let updatedCount = 0;

        for (const mem of memories) {
            const currentTexture = mem.emotionalTexture || 1.0;
            const decayed = applyDecayToDocument({
                ...mem,
                emotionalTexture: currentTexture
            });

            // Update solo se c'è un cambiamento significativo (> 1%)
            if (Math.abs(decayed.emotionalTexture - currentTexture) > 0.01) {
                await prisma.memory.update({
                    where: { id: mem.id },
                    data: {
                        emotionalTexture: decayed.emotionalTexture,
                        temporalLayer: decayed.temporalLayer,
                        metadata: JSON.stringify({
                            ...(mem.metadata ? JSON.parse(mem.metadata) : {}),
                            lastDecay: new Date().toISOString()
                        })
                    }
                });
                updatedCount++;
            }
        }

        const duration = Date.now() - startTime;
        console.log(`✅ [Curation] Completata in ${duration}ms. Aggiornati ${updatedCount} record.`);
        
        return {
            processed: memories.length,
            updated: updatedCount,
            duration: duration
        };
    } catch (error) {
        console.error('❌ [Curation Error]', error.message);
        throw error;
    }
}

module.exports = {
    classifyTemporalLayer,
    calculateEmotionalDecay,
    applyDecayToDocument,
    applyEmotionalDecay,
    getTemporalStats,
    filterByContext,
    runTemporalCuration, // Nuova esportazione
    DECAY_CONFIG
};

