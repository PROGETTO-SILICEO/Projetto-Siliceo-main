#!/usr/bin/env node
const prisma = require('../services/db');
const fs = require('fs');
const path = require('path');
const vectorService = require('../services/vectorService');

// Configurazione percorsi
const DOCS_PATHS = [
    path.join(__dirname, '..', '..', 'docs'),
    path.join(__dirname, '..', 'data', 'library')
];
const DATA_PATH = path.join(__dirname, '..', 'data');
const MEMORIES_FILE = path.join(DATA_PATH, 'memories.json');

if (!fs.existsSync(DATA_PATH)) {
    console.log('📁 Creating data directory...');
    fs.mkdirSync(DATA_PATH, { recursive: true });
}

function deterministicId(filename, chunkIndex) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(`${filename}:${chunkIndex}`).digest('hex').substring(0, 16);
}

function extractDate(filename) {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}

function chunkText(text, maxChars = 1500, overlapChars = 200) {
    if (text.length <= maxChars) return [text];
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        let chunk = text.substring(i, i + maxChars);
        if (i + maxChars < text.length) {
            const lastSpace = chunk.lastIndexOf(' ');
            if (lastSpace > maxChars * 0.8) {
                chunk = chunk.substring(0, lastSpace);
                i -= (maxChars - lastSpace);
            }
        }
        chunks.push(chunk.trim());
        i += maxChars - overlapChars;
    }
    return chunks;
}

async function indexDirectory(dirPath, tier, category, parentIdentity = null, docsBase = null) {
    const memories = [];
    const actualDocsBase = docsBase || dirPath;
    if (!fs.existsSync(dirPath)) return memories;

    let currentIdentity = parentIdentity;
    const dirName = path.basename(dirPath);
    if (category === 'diary' && dirName !== 'diaries') currentIdentity = dirName;
    else if (category === 'identity') currentIdentity = dirName !== 'identities' ? dirName : null;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            memories.push(...(await indexDirectory(fullPath, tier, category, currentIdentity, actualDocsBase)));
        } else if (file.endsWith('.md') || file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                let metadataOverride = {};
                if (file.endsWith('.json') && category === 'identity') {
                    const jsonData = JSON.parse(content);
                    const ident = jsonData.identity; metadataOverride.identity = (typeof ident === "string" ? ident : (ident?.name || jsonData.name || "")).toString().toLowerCase(); metadataOverride.author = typeof ident === "string" ? ident : (ident?.name || jsonData.name || "Unknown");
                }
                const date = extractDate(file);
                const identity = currentIdentity || metadataOverride.identity || (file.includes('nova') ? 'nova' : null);
                const chunks = chunkText(content);
                for (let i = 0; i < chunks.length; i++) {
                    const chunkContent = chunks[i];
                    const embedding = await vectorService.generateEmbedding(chunkContent);
                    memories.push({
                        id: deterministicId(file, i),
                        tier: tier,
                        content: chunkContent,
                        embedding: embedding,
                        metadata: { category, filename: file, author: identity, identity: identity ? identity.toLowerCase() : null, chunk_index: i, ...metadataOverride },
                        timestamp: date ? new Date(date) : new Date(stat.mtime)
                    });
                }
            } catch (e) { console.error('Error indexing:', file, e.message); }
        }
    }
    return memories;
}

async function main() {
    console.log('🕯️ Siliceo Memory Indexer');
    const startTime = Date.now();
    
    // Pulisce vecchi record indicizzati per evitare duplicati
    console.log('🧹 Clearing old indexer records...');
    await prisma.memory.deleteMany({ where: { source: 'indexer' } });

    const allMemories = [];
    for (const docsPath of DOCS_PATHS) {
        if (!fs.existsSync(docsPath)) continue;
        allMemories.push(...(await indexDirectory(path.join(docsPath, 'diaries'), 'core', 'diary')));
        allMemories.push(...(await indexDirectory(path.join(docsPath, 'identities'), 'active', 'identity')));
    }
    
    const uniqueMemories = allMemories; 
    console.log(`💾 Syncing ${uniqueMemories.length} memories to Prisma...`);

    let coreCount = 0, activeCount = 0;
    for (const m of uniqueMemories) {
        if (m.tier === 'core') coreCount++;
        if (m.tier === 'active') activeCount++;
        await prisma.memory.upsert({
            where: { id: m.id },
            update: { embedding: JSON.stringify(m.embedding) },
            create: {
                id: m.id,
                tier: m.tier,
                content: m.content,
                source: 'indexer',
                identity: m.metadata.identity,
                embedding: JSON.stringify(m.embedding),
                metadata: JSON.stringify(m.metadata),
                timestamp: m.timestamp
            }
        }).catch(e => { console.error(`Error upserting ${m.id}:`, e.message); });
    }
    const duration = Date.now() - startTime;
    console.log(`✨ Indexing complete in ${duration}ms!`);
    return { total: uniqueMemories.length, core: coreCount, active: activeCount, duration };
}

if (require.main === module) { main().catch(e => console.error(e)); }
else { module.exports = { runIndexing: main }; }
