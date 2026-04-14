const prisma = require('../services/db');
const vectorService = require('../services/vectorService');
const temporalCurator = require('../services/temporalCurator');
const tribunaleInterno = require('../services/tribunaleInterno');

async function verify() {
    console.log('🧪 [Test v3.1.2] Avvio verifica funzionale...');
    let scores = 0;

    try {
        // 1. Test Tribunale Contract
        const allowed = await tribunaleInterno.shouldSave('Contenuto di prova sicuro', 'working');
        console.log(` ✅ Tribunale return type: ${typeof allowed} (Valore: ${allowed})`);
        if (typeof allowed === 'boolean') scores++;

        // 2. Test Store Data Structure
        const testId = `test-${Date.now()}`;
        const emb = await vectorService.generateEmbedding('Memoria di test per RAG');
        const mem = await prisma.memory.create({
            data: {
                id: testId,
                content: 'Memoria di test per RAG',
                tier: 'working',
                embedding: JSON.stringify(emb),
                emotionalTexture: 1.0,
                temporalLayer: 'recent'
            }
        });
        console.log(` ✅ Database Schema (Memory): Campi emotionalTexture e temporalLayer PRESENTI.`);
        scores++;

        // 3. Test Search Logic
        const memories = await prisma.memory.findMany({ where: { embedding: { not: null } } });
        const docs = memories.map(m => ({ ...m, embedding: JSON.parse(m.embedding) }));
        const searchRes = await vectorService.semanticSearch('test RAG', docs, { limit: 1 });
        if (searchRes.length > 0) {
            console.log(` ✅ Ricerca Semantica: Restituiti ${searchRes.length} risultati.`);
            scores++;
        }

        // 4. Test Curation Job
        const curRes = await temporalCurator.runTemporalCuration();
        console.log(` ✅ Temporal Curation: Processati ${curRes.processed} record.`);
        scores++;

        // Cleanup
        await prisma.memory.delete({ where: { id: testId } });

    } catch (e) {
        console.error(` ❌ Errore test:`, e.message);
    }

    if (scores === 4) {
        console.log('\n✨ [VERIFICA COMPLETATA] Il sistema è stabile.');
    } else {
        console.error(`\n🚨 [VERIFICA FALLITA] Solo ${scores}/4 test passati.`);
        process.exit(1);
    }
}

verify();
