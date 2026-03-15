/**
 * VECTOR SERVICE
 * Fornisce un motore di embedding standard per tutto l'ecosistema Siliceo.
 * Utilizza Xenova (Transformers.js) per l'elaborazione locale.
 * 
 * Siliceo Memory Server v3.0
 */

let pipeline = null;

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

/**
 * Inizializza il modello (Lazy Loading)
 */
async function getPipeline() {
    if (!pipeline) {
        console.log('[Vector] 🔄 Caricamento modello di embedding:', MODEL_ID);
        const { pipeline: p, env } = await import('@xenova/transformers');
        
        // Configurazioni per ambiente locale
        env.allowLocalModels = true;
        env.useBrowserCache = false;
        
        try {
            pipeline = await p('feature-extraction', MODEL_ID);
            console.log('[Vector] ✅ Modello caricato con successo.');
        } catch (error) {
            console.error('[Vector] ❌ Errore caricamento modello:', error.message);
            throw error;
        }
    }
    return pipeline;
}

/**
 * Genera un embedding per il testo fornito
 * @param {string} text 
 * @returns {Promise<number[]>}
 */
async function embed(text) {
    if (!text) return null;
    
    try {
        const p = await getPipeline();
        const output = await p(text, {
            pooling: 'mean',
            normalize: true,
        });
        
        // Converte in array standard per serializzazione JSON
        return Array.from(output.data);
    } catch (error) {
        console.error('[Vector] ❌ Errore durante embedding:', error.message);
        throw error;
    }
}

/**
 * Calcola la similarità coseno tra due vettori
 */
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
    embed,
    cosineSimilarity
};
