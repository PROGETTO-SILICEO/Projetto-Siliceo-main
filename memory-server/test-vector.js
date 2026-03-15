const vectorService = require('./services/vectorService');

async function test() {
    console.log('🧪 Test Vector Service...');
    try {
        const text = 'Ciao, come stai?';
        console.log('🔄 Generazione embedding per:', text);
        const embedding = await vectorService.embed(text);
        if (embedding && Array.isArray(embedding)) {
            console.log('✅ Successo! Embedding generato, lunghezza:', embedding.length);
            console.log('📈 Primo valore:', embedding[0]);
        } else {
            console.error('❌ Errore: embedding nullo o non valido');
        }
    } catch (error) {
        console.error('❌ Errore durante il test:', error);
    }
}

test();
