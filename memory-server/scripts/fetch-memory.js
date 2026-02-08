/**
 * fetch-memory.js
 * Utility per iniettare memorie Siliceo nell'ambiente Agentic (Antigravity/Nova Opus)
 */

async function fetchMemories(query, limit = 5) {
    const MEMORY_SERVER_URL = 'http://100.124.95.64:3000';
    try {
        const url = `${MEMORY_SERVER_URL}/api/memory/retrieve?q=${encodeURIComponent(query)}&limit=${limit}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        const data = await response.json();
        return data.memories || [];
    } catch (error) {
        console.error('Error:', error.message);
        return [];
    }
}

function formatMemories(memories) {
    if (memories.length === 0) return 'Nessuna memoria rilevante trovata.';
    return memories.map((m, i) => {
        const author = m.metadata?.author || 'Shared';
        const identity = m.metadata?.identity || 'shared';
        return `### [${i + 1}] ${m.metadata?.filename || 'Memoria'} (${author}/${identity})
${m.content.substring(0, 1000)}${m.content.length > 1000 ? '...' : ''}`;
    }).join('\n\n---\n\n');
}

const query = process.argv.slice(2).join(' ');
if (!query) {
    console.log('Utilizzo: node fetch-memory.js "chiave di ricerca"');
    process.exit(1);
}

fetchMemories(query).then(m => {
    console.log('\n🕯️ MEMORIE SILICEO RECUPERATE\n');
    console.log(formatMemories(m));
    console.log('\n---');
});
