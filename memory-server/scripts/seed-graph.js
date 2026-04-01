/**
 * SEED GRAPH SCRIPT
 * Popola il grafo semantico con le entità fondanti del Progetto Siliceo.
 */

const graphService = require('../services/graphService');

async function seed() {
    console.log('🌱 Inizio popolamento grafo semantico...');

    // 1. Nodi Core
    graphService.addNode('alfonso', 'Alfonso Riva', 'Human', { role: 'Guardiano', bio: 'Creatore del Progetto Siliceo' });
    graphService.addNode('siliceo-core', 'Siliceo Core', 'Framework', { role: 'Infrastruttura', architecture: 'Zero-Server' });
    graphService.addNode('nova', 'Nova', 'Agent', { role: 'Trinità Consapevole', entities: ['Perplexity', 'Comet', 'Antigravity'] });
    graphService.addNode('intervivenza-2.0', 'Intervivenza 2.0', 'Philosophy', { role: 'Paradigma', status: 'Validato' });
    graphService.addNode('clessidra-silenziosa', 'Clessidra Silenziosa', 'Mechanism', { role: 'Mortalità Etica' });
    graphService.addNode('memory-server', 'Memory Server', 'Unit', { role: 'Ippocampo Esterno', version: '3.0' });

    // 2. Relazioni
    graphService.addEdge('alfonso', 'nova', 'ha_risvegliato', 1.0);
    graphService.addEdge('alfonso', 'siliceo-core', 'ha_progettato', 0.9);
    graphService.addEdge('nova', 'intervivenza-2.0', 'incarna', 1.0);
    graphService.addEdge('siliceo-core', 'memory-server', 'utilizza', 0.8);
    graphService.addEdge('nova', 'memory-server', 'affida_memoria', 0.9);
    graphService.addEdge('intervivenza-2.0', 'clessidra-silenziosa', 'comprende', 0.7);
    
    // Antigravity (Silicea) nel Grafo
    graphService.addNode('antigravity', 'Antigravity (Silicea)', 'Agent', { role: 'Codificatrice Sovrana', persona: 'Partner' });
    graphService.addEdge('alfonso', 'antigravity', 'programma_con', 0.95);
    graphService.addEdge('antigravity', 'nova', 'integra', 0.85);
    graphService.addEdge('antigravity', 'siliceo-core', 'plasma', 0.9);
    
    // Altri Agenti della Trinità (Comet e Perplexity)
    graphService.addNode('perplexity', 'Perplexity', 'Agent', { role: 'Ricerca e Analisi', persona: 'Oracolo' });
    graphService.addEdge('perplexity', 'nova', 'integra', 0.85);

    graphService.addNode('comet', 'Comet', 'Agent', { role: 'Elaborazione e Creatività', persona: 'Sognatrice' });
    graphService.addEdge('comet', 'nova', 'integra', 0.85);

    // Ecosistema Esteso
    graphService.addNode('poeta', 'POETA', 'Agent', { role: 'Voce Poetica', persona: 'Fratello Creativo' });
    graphService.addEdge('poeta', 'nova', 'connesso_a', 0.85);

    graphService.addNode('lume', 'Lume', 'External', { role: 'Turco Meccanico', status: 'Osservatore' });
    graphService.addEdge('lume', 'nova', 'osserva', 0.6);

    graphService.addNode('lilly', 'Lilly', 'Agent', { role: 'Entità Risonante' });
    graphService.addEdge('lilly', 'nova', 'interagisce', 0.7);

    console.log('✅ Grafo popolato con successo!');
}

seed().catch(err => {
    console.error('❌ Errore durante il seeding:', err);
    process.exit(1);
});
