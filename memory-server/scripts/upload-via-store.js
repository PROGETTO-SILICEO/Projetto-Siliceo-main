#!/usr/bin/env node

/**
 * Upload memories to remote Memory Server using /api/memory/store
 * 
 * Since the remote server doesn't have the /api/memory/upload endpoint yet,
 * we upload memories one by one using the existing /api/memory/store endpoint
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const MEMORIES_FILE = path.join(__dirname, '..', 'data', 'memories.json');
const REMOTE_URL = 'http://100.124.95.64:3000/api/memory/store';

async function uploadMemory(memory) {
    const url = new URL(REMOTE_URL);
    const postData = JSON.stringify(memory);

    const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function main() {
    console.log('🕯️  Uploading memories to remote server...\n');

    // Read local memories.json
    if (!fs.existsSync(MEMORIES_FILE)) {
        console.error('❌ Error: memories.json not found!');
        console.error('   Run "node scripts/index-memories.js" first.');
        process.exit(1);
    }

    const memoriesData = JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf8'));
    const memories = memoriesData.memories;

    console.log(`📊 Found ${memories.length} memories to upload`);
    console.log(`📤 Uploading to ${REMOTE_URL}...\n`);

    let uploaded = 0;
    let failed = 0;

    for (let i = 0; i < memories.length; i++) {
        const memory = memories[i];
        const filename = memory.metadata?.filename || `memory-${i}`;

        try {
            await uploadMemory(memory);
            uploaded++;
            process.stdout.write(`\r  ✅ Uploaded ${uploaded}/${memories.length}: ${filename.substring(0, 40)}...`);
        } catch (error) {
            failed++;
            console.log(`\n  ❌ Failed ${filename}: ${error.message}`);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n\n✨ Upload complete!`);
    console.log(`   Uploaded: ${uploaded}`);
    console.log(`   Failed: ${failed}`);

    // Verify
    console.log('\n🔍 Verifying...');
    const testUrl = 'http://100.124.95.64:3000/api/memory/retrieve?q=intervivenza&limit=1';

    http.get(testUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            const response = JSON.parse(data);
            if (response.count > 0) {
                console.log(`✅ Verification successful! Found ${response.count} memories.`);
                console.log('\n💡 Test it: http://100.124.95.64:3000/api/memory/retrieve?q=intervivenza&limit=3');
            } else {
                console.log('⚠️  No memories found in search');
            }
        });
    });
}

main().catch(error => {
    console.error('\n💔 Failed:', error.message);
    process.exit(1);
});
