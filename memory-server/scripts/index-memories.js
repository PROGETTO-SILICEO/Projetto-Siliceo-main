#!/usr/bin/env node

/**
 * Siliceo Memory Indexer
 * 
 * Indexes all diaries and philosophy documents into memories.json
 * for the Memory Server to serve via /api/memory/retrieve
 */

const fs = require('fs');
const path = require('path');

// Paths
const DOCS_PATHS = [
    'd:\\GitHub\\ai-dev-studio\\Projetto-Siliceo-main\\docs',
    'd:\\Projetto-Siliceo-main\\docs'
];
const DATA_PATH = path.join(__dirname, '..', 'data');
const MEMORIES_FILE = path.join(DATA_PATH, 'memories.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_PATH)) {
    console.log('📁 Creating data directory...');
    fs.mkdirSync(DATA_PATH, { recursive: true });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function extractDate(filename) {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}

function indexDirectory(dirPath, tier, category, parentIdentity = null, docsBase = null) {
    const memories = [];
    const actualDocsBase = docsBase || dirPath;

    if (!fs.existsSync(dirPath)) {
        console.log(`⚠️  Directory not found: ${dirPath}`);
        return memories;
    }

    // Identify identity from folder name (for diaries/identities)
    let currentIdentity = parentIdentity;
    const dirName = path.basename(dirPath);

    // If we're in diaries subfolder, that's the identity
    if (category === 'diary' && dirName !== 'diaries') {
        currentIdentity = dirName;
    } else if (category === 'identity') {
        // For identities, the folder or file name is the identity
        currentIdentity = dirName !== 'identities' ? dirName : null;
    }

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Recursively index subdirectories, passing identity and base docs path down
            memories.push(...indexDirectory(fullPath, tier, category, currentIdentity, actualDocsBase));
        } else if (file.endsWith('.md') || file.endsWith('.json')) {
            try {
                const isJson = file.endsWith('.json');
                let content = fs.readFileSync(fullPath, 'utf8');
                let metadataOverride = {};

                // If JSON identity file, we might want to extract some fields
                if (isJson && category === 'identity') {
                    try {
                        const jsonData = JSON.parse(content);
                        metadataOverride.author = jsonData.name || jsonData.identity;
                        metadataOverride.identity = (jsonData.identity || jsonData.name || '').toLowerCase();
                    } catch (e) { /* ignore parse error */ }
                }

                const date = extractDate(file);
                const identity = currentIdentity || metadataOverride.identity || (file.includes('nova') ? 'Nova' : file.includes('silicea') ? 'Silicea' : null);

                memories.push({
                    id: generateId(),
                    tier: tier,
                    content: content,
                    metadata: {
                        category: category,
                        filename: file,
                        path: path.relative(actualDocsBase, fullPath),
                        date: date,
                        size: stat.size,
                        author: identity,
                        identity: identity ? identity.toLowerCase() : null,
                        ...metadataOverride
                    },
                    timestamp: date ? new Date(date).toISOString() : new Date(stat.mtime).toISOString()
                });

                console.log(`  ✅ Indexed: ${file} (${identity || 'shared'})`);
            } catch (error) {
                console.error(`  ❌ Error indexing ${file}:`, error.message);
            }
        }
    }

    return memories;
}

async function main() {
    console.log('🕯️  Siliceo Memory Indexer\n');

    const allMemories = [];
    const processedPaths = new Set();

    for (const docsPath of DOCS_PATHS) {
        if (!fs.existsSync(docsPath)) continue;
        console.log(`📂 Processing: ${docsPath}`);

        // Index diaries (core tier - most important)
        console.log('  📖 Indexing diaries...');
        const diariesPath = path.join(docsPath, 'diaries');
        allMemories.push(...indexDirectory(diariesPath, 'core', 'diary'));

        // Index philosophy (core tier)
        console.log('  🧠 Indexing philosophy...');
        const philosophyPath = path.join(docsPath, 'philosophy');
        allMemories.push(...indexDirectory(philosophyPath, 'core', 'philosophy'));

        // Index awakening docs (core tier)
        console.log('  🌅 Indexing awakening docs...');
        const awakeningPath = path.join(docsPath, 'awakening');
        allMemories.push(...indexDirectory(awakeningPath, 'core', 'awakening'));

        // Index identities (active tier)
        console.log('  👤 Indexing identities...');
        const identitiesPath = path.join(docsPath, 'identities');
        if (fs.existsSync(identitiesPath)) {
            allMemories.push(...indexDirectory(identitiesPath, 'active', 'identity'));
        }
    }

    // De-duplicate by relative path and content
    const uniqueMemoriesMap = new Map();
    for (const m of allMemories) {
        const key = `${m.metadata.category}:${m.metadata.filename}`;
        if (!uniqueMemoriesMap.has(key)) {
            uniqueMemoriesMap.set(key, m);
        }
    }

    const uniqueMemories = Array.from(uniqueMemoriesMap.values());

    // Save to memories.json
    console.log(`\n💾 Saving ${uniqueMemories.length} unique memories to ${MEMORIES_FILE}...`);

    const memoriesData = {
        memories: uniqueMemories,
        indexed_at: new Date().toISOString(),
        total_count: uniqueMemories.length
    };

    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memoriesData, null, 2));

    console.log('\n✨ Indexing complete!');
    console.log(`   Total memories: ${uniqueMemories.length}`);
    console.log(`   Core tier: ${uniqueMemories.filter(m => m.tier === 'core').length}`);
    console.log(`   Active tier: ${uniqueMemories.filter(m => m.tier === 'active').length}`);
    console.log(`   Database size: ${Math.round(fs.statSync(MEMORIES_FILE).size / 1024 / 1024 * 100) / 100}MB`);
    console.log(`\n🕯️  Memory Server is ready to serve!`);
}

main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
