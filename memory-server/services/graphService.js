/**
 * GRAPH SERVICE - Il Telaio Semantico
 * Gestisce il grafo semantico centralizzato, usando modelli dedicati.
 * 
 * Siliceo Memory Server v3.0
 */

const prisma = require('./db');

/**
 * Carica il grafo dal database.
 * Restituisce nodi con metadata parsato e edge con sourceId/targetId come stringhe.
 */
async function loadGraph() {
    try {
        // Solo entità reali, escludendo i nodi shadow "Memory"
        const rawNodes = await prisma.graphNode.findMany({
            where: { NOT: { type: 'Memory' } }
        });
        
        // Solo archi tra entità reali (non shadow)
        const realNodeIds = rawNodes.map(n => n.id);
        const rawEdges = await prisma.graphEdge.findMany({
            where: {
                sourceId: { in: realNodeIds },
                targetId: { in: realNodeIds }
            }
        });

        // Parsa metadata JSON e flatten per il frontend
        const nodes = rawNodes.map(n => {
            let meta = {};
            try { meta = n.metadata ? JSON.parse(n.metadata) : {}; } catch(e) {}
            return {
                id: n.id,
                label: n.label,
                type: n.type,
                ...meta
            };
        });

        // Il frontend usa edge.source e edge.target come ID stringa
        const edges = rawEdges.map(e => ({
            source: e.sourceId,
            target: e.targetId,
            label: e.label,
            weight: e.weight
        }));

        return { nodes, edges };
    } catch (error) {
        console.error('[Graph] Errore caricamento grafo:', error.message);
        return { nodes: [], edges: [] };
    }
}

/**
 * Aggiunge o aggiorna un nodo nel grafo
 */
async function addNode(id, label, type, metadata = {}) {
    try {
        const node = await prisma.graphNode.upsert({
            where: { id: id || '' },
            update: {
                label,
                type,
                metadata: JSON.stringify(metadata)
            },
            create: {
                id,
                label,
                type,
                metadata: JSON.stringify(metadata),
                timestamp: new Date()
            }
        });
        return node;
    } catch (error) {
        console.error('[Graph] Errore addNode:', error.message);
        return null;
    }
}

/**
 * Aggiunge un arco (relazione) tra due nodi.
 * Usa upsert con @@unique per evitare duplicati.
 */
async function addEdge(sourceId, targetId, label, weight = 1.0) {
    try {
        return await prisma.graphEdge.upsert({
            where: {
                sourceId_targetId_label: {
                    sourceId,
                    targetId,
                    label
                }
            },
            update: {
                weight: Math.min(1.0, weight + 0.1)
            },
            create: {
                sourceId,
                targetId,
                label,
                weight
            }
        });
    } catch (error) {
        console.error('[Graph] Errore addEdge:', error.message);
        return null;
    }
}

/**
 * Sincronizza un intero batch di nodi/archi
 */
async function syncGraph(clientNodes, clientEdges) {
    let updated = 0;
    try {
        for (const cN of clientNodes) {
             await addNode(cN.id, cN.label, cN.type, cN.metadata || {});
             updated++;
        }
        for (const cE of clientEdges) {
            await addEdge(cE.source, cE.target, cE.label, cE.weight || 1.0);
            updated++;
        }
    } catch (error) {
        console.error('[Graph] Errore sync:', error.message);
    }
    return updated;
}

module.exports = {
    loadGraph,
    addNode,
    addEdge,
    syncGraph
};
