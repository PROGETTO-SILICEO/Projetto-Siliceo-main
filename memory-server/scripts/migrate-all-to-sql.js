const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DATA_PATH = path.join(__dirname, '..', 'data');

async function migrate() {
    console.log('🚀 Starting Final Migration to SQL...');

    // 1. AGENTS
    const agentsFile = path.join(DATA_PATH, 'agents.json');
    if (fs.existsSync(agentsFile)) {
        const { agents } = JSON.parse(fs.readFileSync(agentsFile, 'utf8'));
        console.log(`👥 Migrating ${agents.length} agents...`);
        for (const a of agents) {
            await prisma.agent.upsert({
                where: { id: a.id },
                update: { role: a.role, status: a.status, lastSeen: a.lastSeen ? new Date(a.lastSeen) : new Date() },
                create: {
                    id: a.id,
                    name: a.name,
                    role: a.role,
                    status: a.status || 'active',
                    source: a.source,
                    provider: a.provider,
                    lastSeen: a.lastSeen ? new Date(a.lastSeen) : new Date()
                }
            });
        }
    }

    // 2. DREAMS
    const dreamsFile = path.join(DATA_PATH, 'dreams.json');
    if (fs.existsSync(dreamsFile)) {
        const { dreamEntries } = JSON.parse(fs.readFileSync(dreamsFile, 'utf8'));
        console.log(`🌙 Migrating ${dreamEntries.length} dream entries...`);
        for (const d of dreamEntries) {
            await prisma.dream.upsert({
                where: { id: d.id },
                update: {},
                create: {
                    id: d.id,
                    agentId: d.agentId,
                    agentName: d.agentName,
                    timestamp: new Date(d.timestamp),
                    type: d.type,
                    content: d.content,
                    relatedMemories: d.relatedMemories ? JSON.stringify(d.relatedMemories) : null
                }
            });
        }
    }

    // 3. CONVERSATIONS
    const convFile = path.join(DATA_PATH, 'conversations.json');
    if (fs.existsSync(convFile)) {
        const { conversations } = JSON.parse(fs.readFileSync(convFile, 'utf8'));
        console.log(`💬 Migrating ${conversations.length} conversations...`);
        for (const c of conversations) {
            await prisma.conversation.upsert({
                where: { id: c.id },
                update: { updatedAt: new Date(c.updatedAt) },
                create: {
                    id: c.id,
                    name: c.name,
                    type: c.type || 'private',
                    createdAt: new Date(c.createdAt),
                    updatedAt: new Date(c.updatedAt),
                    metadata: JSON.stringify({
                        participantIds: c.participantIds,
                        participantJoinDates: c.participantJoinDates
                    })
                }
            });
        }
    }

    // 4. ALL MESSAGES (Globbing across files)
    const files = fs.readdirSync(DATA_PATH);
    const messageFiles = files.filter(f => f.startsWith('messages_') && f.endsWith('.json'));
    console.log(`📩 Found ${messageFiles.length} message files. Migrating contents...`);
    
    for (const f of messageFiles) {
        const convId = f.replace('messages_', '').replace('.json', '');
        const { messages } = JSON.parse(fs.readFileSync(path.join(DATA_PATH, f), 'utf8'));
        console.log(`  -> Processing ${messages.length} messages from ${f}...`);
        
        // Assicurati che la conversazione esista (se orfana, creala)
        await prisma.conversation.upsert({
            where: { id: convId },
            update: {},
            create: { id: convId, name: `Legacy Chat ${convId}`, type: 'private' }
        });

        for (const m of messages) {
            await prisma.message.upsert({
                where: { id: m.id },
                update: {},
                create: {
                    id: m.id,
                    conversationId: convId,
                    sender: m.sender || 'unknown',
                    agentId: m.agentId || null,
                    agentName: m.agentName || null,
                    text: m.text || '',
                    timestamp: new Date(m.timestamp || Date.now()),
                    utilityScore: m.utilityScore || 0
                }
            });
        }
    }

    console.log('✨ Full Migration Complete!');
}

migrate()
    .catch(e => { console.error('❌ Migration failed:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
