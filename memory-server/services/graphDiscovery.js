/**
 * GRAPH DISCOVERY SERVICE
 * Scopre automaticamente relazioni tra memorie ed entità del grafo semantico.
 */

const prisma = require('./db');

// Entità conosciute da monitorare (id nel grafo)
const KNOWN_ENTITIES = [
    'alfonso', 'nova', 'antigravity', 'siliceo-core', 'poeta', 
    'lume', 'lilly', 'perplexity', 'comet', 'memory-server', 
    'intervivenza-2.0', 'clessidra-silenziosa'
];

/**
 * Processa una singola memoria per scoprire relazioni basate sul testo
 */
async function processMemory(memory) {
    if (!memory || !memory.content) return;

    try {
        console.log(`🔍 [Discovery] Analisi memoria ${memory.id}...`);

        // 1. MENTIONS DISCOVERY (Ricerca nomi entità nel testo)
        for (const entityId of KNOWN_ENTITIES) {
            // Check per id o label (semplificato)
            const regex = new RegExp(`\\b${entityId}\\b`, 'gi');
            if (regex.test(memory.content)) {
                console.log(`   🔗 Mentions trovata: ${entityId}`);
                await addGraphRelation(memory.id, entityId, 'mentions', 0.8);
            }
        }

        // 2. IDENTITY LINK (Se la memoria ha un'identità, collegala)
        if (memory.identity) {
            const identityNodeId = memory.identity.toLowerCase();
            if (KNOWN_ENTITIES.includes(identityNodeId)) {
                await addGraphRelation(memory.id, identityNodeId, 'belongs_to', 1.0);
            }
        }

        // 3. SEMANTIC LINK (Similarità con entità core)
        // (Opzionale: implementabile caricando i descrittori delle entità)
        
    } catch (error) {
        console.error(`❌ [Discovery] Errore processMemory:`, error.message);
    }
}

/**
 * Utilità per aggiungere una relazione grafo-memoria (arco)
 */
async function addGraphRelation(sourceId, targetId, label, weight) {
    try {
        // 1. Verifica esplicitamente l'esistenza del target (Entità Core)
        // Questo evita fallimenti silenziosi dovuti a vincoli di Foreign Key in SQL
        const targetNode = await prisma.graphNode.findUnique({
            where: { id: targetId }
        });

        if (!targetNode) {
            console.warn(`⚠️ [Discovery] Salto arco: il nodo target '${targetId}' non esiste nel grafo.`);
            return;
        }

        // 2. Assicurati che la memoria esista come nodo "shadow" nel grafo
        // Le memorie non sono core entities, ma devono essere GraphNode per apparire nel canvas
        await prisma.graphNode.upsert({
            where: { id: sourceId },
            update: {},
            create: {
                id: sourceId,
                label: "Memory Block",
                type: "Memory",
                metadata: JSON.stringify({ isShadow: true })
            }
        });

        // 3. Crea l'arco reale
        await prisma.graphEdge.upsert({
            where: {
                sourceId_targetId_label: {
                    sourceId,
                    targetId,
                    label
                }
            },
            update: { weight },
            create: {
                sourceId,
                targetId,
                label,
                weight
              }
        });
        
        console.log(`   ✅ Arco creato: [${sourceId}] --(${label})--> [${targetId}]`);
    } catch (e) {
        console.error(`❌ [Discovery Error] Fallimento creazione arco ${sourceId}->${targetId}:`, e.message);
    }
}


/**
 * Scansione massiva di memorie non ancora processate
 */
async function runDiscoveryJob(limit = 100) {
    console.log('🚀 [Discovery] Slot Discovery Job in corso...');
    try {
        // Prende memorie recenti (o casuali per ora)
        const memories = await prisma.memory.findMany({
            take: limit,
            orderBy: { timestamp: 'desc' }
        });

        for (const m of memories) {
            await processMemory(m);
        }
        console.log(`✅ [Discovery] Job completato. Processate ${memories.length} memorie.`);
    } catch (error) {
        console.error('❌ [Discovery] Job error:', error.message);
    }
}

module.exports = {
    processMemory,
    runDiscoveryJob
};
