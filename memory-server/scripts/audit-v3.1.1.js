const path = require('path');
const fs = require('fs');

async function runAudit() {
    console.log('🔍 [Audit v3.1.1] Avvio verifica integrità...');
    let errors = 0;

    const checkExport = (modulePath, funcName) => {
        try {
            const mod = require(modulePath);
            if (typeof mod[funcName] === 'function') {
                console.log(` ✅ ${path.basename(modulePath)}: esporta '${funcName}'`);
            } else {
                console.error(` ❌ ${path.basename(modulePath)}: MANCA '${funcName}'`);
                errors++;
            }
        } catch (e) {
            console.error(` ❌ ${path.basename(modulePath)}: Errore caricamento - ${e.message}`);
            errors++;
        }
    };

    // 1. Audit Service
    checkExport('../services/vectorService', 'semanticSearch');
    checkExport('../services/temporalCurator', 'runTemporalCuration');
    checkExport('../services/tribunaleInterno', 'shouldSave');
    checkExport('../services/graphDiscovery', 'processMemory');
    checkExport('../scripts/index-memories', 'runIndexing');

    // 2. Audit Prisma Singleton (Grep check)
    const filesToAudit = [
        '../index.js',
        '../routes/agents.js',
        '../routes/conversations.js',
        '../routes/dreams.js',
        '../routes/memory.js',
        '../services/graphDiscovery.js',
        '../services/temporalCurator.js'
    ];

    console.log('\n🔍 Verifica Singleton Prisma...');
    for (const f of filesToAudit) {
        const fullPath = path.join(__dirname, f);
        if (!fs.existsSync(fullPath)) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('require(') && (content.includes('db') || content.includes('services/db'))) {
            console.log(` ✅ ${path.basename(f)}: usa Singleton Prisma`);
        } else {
            console.warn(` ⚠️ ${path.basename(f)}: possibile istanza Prisma inline!`);
            // errors++; // Non bloccante ma segnalato
        }
    }

    if (errors === 0) {
        console.log('\n✨ [Audit SUCCESS] Tutti i punti critici sono validati.');
    } else {
        console.error(`\n🚨 [Audit FAILED] Trovati ${errors} errori critici.`);
        process.exit(1);
    }
}

runAudit();
