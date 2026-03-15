/**
 * GRAPH SERVICE - Il Telaio Semantico
 * Gestisce il grafo semantico centralizzato, aggregando relazioni
 * scoperte dai vari client.
 * 
 * Siliceo Memory Server v3.0
 */

const fs = require('fs');
const path = require('path');

const GRAPH_PATH = path.join(__dirname, '..', 'data', 'semantic_graph.json');

/**
 * Carica il grafo dal disco
 */
function loadGraph() {
    try {
        if (fs.existsSync(GRAPH_PATH)) {
            return JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
        } else {
            // Crea un grafo vuoto se non esiste
            const emptyGraph = { nodes: [], edges: [] };
            saveGraph(emptyGraph);
            return emptyGraph;
        }
    } catch (error) {
        console.error('[Graph] Errore caricamento grafo:', error.message);
    }
    return { nodes: [], edges: [] };
}

/**
 * Salva il grafo su disco
 */
function saveGraph(graph) {
    try {
        fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2));
        return true;
    } catch (error) {
        console.error('[Graph] Errore salvataggio grafo:', error.message);
        return false;
    }
}

/**
 * Aggiunge o aggiorna un nodo nel grafo
 */
function addNode(id, label, type, metadata = {}) {
    const graph = loadGraph();
    const existingIndex = graph.nodes.findIndex(n => n.id === id);
    
    const node = {
        id,
        label,
        type,
        lastUpdate: Date.now(),
        ...metadata
    };

    if (existingIndex >= 0) {
        graph.nodes[existingIndex] = { ...graph.nodes[existingIndex], ...node };
    } else {
        graph.nodes.push(node);
    }

    saveGraph(graph);
    return node;
}

/**
 * Aggiunge un arco (relazione) tra due nodi
 */
function addEdge(source, target, label, weight = 1.0) {
    const graph = loadGraph();
    
    // Controlla se l'arco esiste già
    const existingIndex = graph.edges.findIndex(e => 
        (e.source === source && e.target === target && e.label === label) ||
        (e.source === target && e.target === source && e.label === label)
    );

    if (existingIndex >= 0) {
        graph.edges[existingIndex].weight = Math.min(1.0, graph.edges[existingIndex].weight + 0.1);
        graph.edges[existingIndex].lastSeen = Date.now();
    } else {
        graph.edges.push({
            source,
            target,
            label,
            weight,
            firstSeen: Date.now(),
            lastSeen: Date.now()
        });
    }

    saveGraph(graph);
}

/**
 * Sincronizza un intero batch di nodi/archi (da un client)
 */
function syncGraph(clientNodes, clientEdges) {
    const graph = loadGraph();
    let updated = 0;

    // Merge Nodi
    clientNodes.forEach(cN => {
        const idx = graph.nodes.findIndex(n => n.id === cN.id);
        if (idx === -1) {
            graph.nodes.push({ ...cN, lastUpdate: Date.now() });
            updated++;
        }
    });

    // Merge Archi
    clientEdges.forEach(cE => {
        const idx = graph.edges.findIndex(e => 
            e.source === cE.source && e.target === cE.target && e.label === cE.label
        );
        if (idx === -1) {
            graph.edges.push({ ...cE, lastSeen: Date.now() });
            updated++;
        }
    });

    if (updated > 0) saveGraph(graph);
    return updated;
}

module.exports = {
    loadGraph,
    addNode,
    addEdge,
    syncGraph
};
