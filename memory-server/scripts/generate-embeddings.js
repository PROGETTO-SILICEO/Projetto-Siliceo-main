/**
 * GENERATE EMBEDDINGS
 * Genera embeddings per tutti i ricordi nel file memories.json che ne sono sprovvisti.
 */

const fs = require('fs');
const path = require('path');
const vectorService = require('../services/vectorService');

const MEMORIES_PATH = path.join(__dirname, '..', 'data', 'memories.json');

async function main() {
    console.log('🧪 [Indexer] Avvio generazione embeddings...');

    if (!fs.existsSync(MEMORIES_PATH)) {
        console.error('❌ memories.json non trovato');
        return;
    }

    const data = JSON.parse(fs.readFileSync(MEMORIES_PATH, 'utf8'));
    const memories = data.memories || [];
    
    console.log(`[Indexer] Trovati ${memories.length} ricordi totali.`);
    
    let updatedCount = 0;
    let skipCount = 0;

    for (let i = 0; i < memories.length; i++) {
        const memory = memories[i];
        
        if (memory.embedding) {
            skipCount++;
            continue;
        }

        process.stdout.write(`[Indexer] Generazione embedding ${i + 1}/${memories.length}... `);
        
        try {
            const embedding = await vectorService.generateEmbedding(memory.content);
            if (embedding) {
                memory.embedding = embedding;
                updatedCount++;
                console.log('✅');
            } else {
                console.log('❌');
            }
        } catch (e) {
            console.log(`❌ (${e.message})`);
        }
    }

    if (updatedCount > 0) {
        console.log(`[Indexer] Salvataggio ${updatedCount} nuovi embeddings in memories.json...`);
        fs.writeFileSync(MEMORIES_PATH, JSON.stringify(data, null, 2));
        console.log('✅ Salvataggio completato.');
    } else {
        console.log('[Indexer] Nessun nuovo embedding necessario.');
    }

    console.log(`\n✨ Recap:
   - Totali: ${memories.length}
   - Aggiornati: ${updatedCount}
   - Saltati (già presenti): ${skipCount}`);

    process.exit(0);
}

main().catch(err => {
    console.error('❌ Errore fatale:', err);
    process.exit(1);
});
