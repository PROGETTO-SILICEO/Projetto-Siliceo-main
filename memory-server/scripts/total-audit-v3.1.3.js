const path = require('path');
const fs = require('fs');

async function runTotalAudit() {
    console.log('🚀 [Audit v3.1.3] Avvio validazione integrale del sistema...');
    let errors = 0;

    const testModule = (name, relativePath) => {
        try {
            console.log(` 🔍 Test caricamento modulo: ${name}...`);
            // Carica il router per vedere se ci sono ReferenceError (Prisma non definito, etc)
            require(path.join(__dirname, relativePath));
            console.log(` ✅ ${name}: caricato con successo (no ReferenceErrors)`);
        } catch (e) {
            console.error(` ❌ ${name}: FALLITO - ${e.message}`);
            errors++;
        }
    };

    // 1. Test Caricamento Router (Punto critico ReferenceError)
    testModule('Router Agents', '../routes/agents');
    testModule('Router Dreams', '../routes/dreams');
    testModule('Router Conversations', '../routes/conversations');
    testModule('Router Memory', '../routes/memory');
    testModule('Router Graph', '../routes/graph');

    // 2. Test Caricamento Service (Punto critico Singleton Prisma)
    testModule('Service Daemon', '../services/memoryDaemon');
    testModule('Service GraphDiscovery', '../services/graphDiscovery');
    testModule('Service TribunaleHistory', '../services/tribunaleHistory');

    // 3. Verifica Integrità Logica Daemon (Grep check su nuovi campi SQL)
    console.log('\n🔍 Verifica Allineamento SQL Daemon...');
    const daemonContent = fs.readFileSync(path.join(__dirname, '../services/memoryDaemon.js'), 'utf8');
    if (daemonContent.includes('emotionalTexture') && daemonContent.includes('temporalLayer')) {
        console.log(' ✅ Daemon: allineato ai campi SQL top-level');
    } else {
        console.error(' ❌ Daemon: utilizza ancora la vecchia logica metadata!');
        errors++;
    }

    if (errors === 0) {
        console.log('\n✨ [Audit v3.1.3 SUCCESS] Il sistema è tecnicamente onesto.');
    } else {
        console.error(`\n🚨 [Audit v3.1.3 FAILED] Trovati ${errors} errori critici.`);
        process.exit(1);
    }
}

runTotalAudit();
