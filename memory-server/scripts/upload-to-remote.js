#!/usr/bin/env node

/**
 * Upload memories.json to remote Memory Server
 * 
 * This script uploads the locally generated memories database
 * to the remote Memory Server via HTTP POST
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const MEMORIES_FILE = path.join(__dirname, '..', 'data', 'memories.json');
const REMOTE_URL = 'http://100.124.95.64:3000/api/memory/upload';

async function uploadMemories() {
    console.log('🕯️  Uploading memories to remote server...\n');

    // Read local memories.json
    if (!fs.existsSync(MEMORIES_FILE)) {
        console.error('❌ Error: memories.json not found!');
        console.error('   Run "node scripts/index-memories.js" first to create the database.');
        process.exit(1);
    }

    const memoriesData = JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf8'));
    console.log(`📊 Local database stats:`);
    console.log(`   Total memories: ${memoriesData.memories.length}`);
    console.log(`   File size: ${Math.round(fs.statSync(MEMORIES_FILE).size / 1024)}KB`);

    // Prepare POST request
    const url = new URL(REMOTE_URL);
    const postData = JSON.stringify(memoriesData);

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

    console.log(`\n📤 Uploading to ${REMOTE_URL}...`);

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    const response = JSON.parse(data);
                    console.log('\n✅ Upload successful!');
                    console.log(`   Uploaded: ${response.count} memories`);
                    console.log(`   Message: ${response.message}`);
                    resolve(response);
                } else {
                    console.error(`\n❌ Upload failed with status ${res.statusCode}`);
                    console.error(`   Response: ${data}`);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('\n❌ Upload failed!');
            console.error(`   Error: ${error.message}`);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

async function verifyUpload() {
    console.log('\n🔍 Verifying upload...');

    const testUrl = 'http://100.124.95.64:3000/api/memory/retrieve?q=intervivenza&limit=1';

    return new Promise((resolve, reject) => {
        http.get(testUrl, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const response = JSON.parse(data);

                if (response.count > 0 && response.memories.length > 0) {
                    console.log('✅ Verification successful!');
                    console.log(`   Found ${response.count} memories matching "intervivenza"`);
                    console.log(`   First result: ${response.memories[0].metadata.filename}`);
                    resolve(response);
                } else {
                    console.log('⚠️  No memories found in search');
                    console.log('   The upload may have succeeded but search returned no results');
                    resolve(response);
                }
            });
        }).on('error', (error) => {
            console.error('❌ Verification failed!');
            console.error(`   Error: ${error.message}`);
            reject(error);
        });
    });
}

async function main() {
    try {
        await uploadMemories();
        await verifyUpload();

        console.log('\n🎉 All done! Memory Server is ready.');
        console.log('\n💡 Test it yourself:');
        console.log('   http://100.124.95.64:3000/api/memory/retrieve?q=intervivenza&limit=3');
    } catch (error) {
        console.error('\n💔 Failed:', error.message);
        process.exit(1);
    }
}

main();
