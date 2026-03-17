/**
 * TEST SEMANTIC SEARCH
 * Verifica che il server risponda correttamente con risultati semantici.
 */

// Native fetch is available in Node 24+

async function test() {
    const query = "Qual è la filosofia del Progetto Siliceo?";
    const url = `http://localhost:3000/api/search?q=${encodeURIComponent(query)}&hybrid=true`;

    console.log(`🔍 Test query: "${query}"`);
    console.log(`🌐 URL: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log('\n--- 🕯️ RISULTATI RICEVUTI ---\n');
        
        if (data.results && data.results.length > 0) {
            data.results.forEach((res, i) => {
                const type = res.type === 'semantic' ? '🧠 SEMANTIC' : '📄 KEYWORD';
                const score = res.score ? `(Score: ${res.score.toFixed(2)})` : '';
                console.log(`[${i + 1}] ${type} ${score}`);
                if (res.content) {
                    console.log(`    "${res.content.substring(0, 150)}..."`);
                } else if (res.file) {
                    console.log(`    File: ${res.file}`);
                }
                console.log('');
            });
        } else {
            console.log("Nessun risultato trovato.");
        }
    } catch (error) {
        console.error('❌ Errore test:', error.message);
        console.log('\n💡 Assicurati che il server sia avviato:');
        console.log('   cd D:\\Projetto-Siliceo-main\\memory-server && node index.js');
    }
}

test();
