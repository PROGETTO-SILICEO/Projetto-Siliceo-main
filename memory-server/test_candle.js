// Test Candle Test locally on ThinkCentre
const tribunale = require('./services/tribunaleInterno');

async function test() {
    const tests = [
        'test memory from Nova',
        'Nova ha ricostruito indice chat con 65 entries',
        'hello world',
        'sessione produttiva oggi',
        'Alfonso e Nova hanno lavorato insieme'
    ];

    for (const t of tests) {
        const result = await tribunale.candleTest(t);
        console.log(`"${t}" => ${result.verdict} (${result.method}, conf: ${result.confidence})`);
        console.log(`  reasoning: ${result.reasoning}`);
        console.log();
    }
}

test().catch(console.error);
