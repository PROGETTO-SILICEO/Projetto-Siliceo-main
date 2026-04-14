const path = require('path');

async function testRuntime() {
    console.log('🔍 [Audit Runtime v3.1.4] Avvio validazione query DB...');
    let errors = 0;

    const testPrismaQuery = async (modulePath, mockReq, mockResFn) => {
        try {
            console.log(` ⏳ Test esecuzione runtime su ${path.basename(modulePath)}...`);
            const router = require(modulePath);
            // Simulo una chiamata GET / che dovrebbe eseguire una query Prisma
            const req = mockReq || { method: 'GET', url: '/', query: {}, params: {} };
            let statusCode = 200;
            let responseData = null;
            let responseSent = false;

            const res = {
                status: (code) => { statusCode = code; return res; },
                json: (data) => { responseData = data; responseSent = true; },
                send: (data) => { responseData = data; responseSent = true; },
                setHeader: () => {}
            };

            // Trovo la route handler per GET /
            const route = router.stack.find(layer => layer.route && layer.route.path === req.url && layer.route.methods[req.method.toLowerCase()]);
            
            if (route) {
               await route.route.stack[0].handle(req, res, () => {});
               if(statusCode === 500) {
                    throw new Error(`Endpoint returned 500: ${JSON.stringify(responseData)}`);
               }
               console.log(` ✅ ${path.basename(modulePath)} query runtime OK (Dati: ${JSON.stringify(responseData).substring(0, 50)}...)`);
            } else {
                 console.log(` ⚠️ ${path.basename(modulePath)} no GET / route found, skipping HTTP simulation.`);
            }

        } catch (e) {
            console.error(` ❌ ${path.basename(modulePath)} Runtime Error: ${e.message}`);
            errors++;
        }
    };

    // Test sui router che erano "rotti"
    await testPrismaQuery('../routes/conversations');
    await testPrismaQuery('../routes/dreams');
    
    // Test sul service
    try {
        console.log(` ⏳ Test esecuzione runtime su graphService.js...`);
        const graphService = require('../services/graphService');
        await graphService.loadGraph(); // Questo chiama prisma
        console.log(` ✅ graphService.js query runtime OK`);
    } catch(e) {
        console.error(` ❌ graphService.js Runtime Error: ${e.message}`);
        errors++;
    }

    if (errors === 0) {
        console.log('\n✨ [Audit v3.1.4 SUCCESS] Tutte le query DB runtime passate.');
    } else {
        console.error(`\n🚨 [Audit v3.1.4 FAILED] Trovati ${errors} errori runtime.`);
        process.exit(1);
    }
}

testRuntime();
