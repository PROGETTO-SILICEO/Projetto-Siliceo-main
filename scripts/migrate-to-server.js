/**
 * Siliceo Migration Script
 * Run this in browser console (Comet/Chrome) to sync all data to Memory Server
 * 
 * Usage: Copy this entire script and paste in DevTools Console
 */

const MEMORY_SERVER = 'http://100.124.95.64:3000';

async function migrateAll() {
    console.log('🚀 Starting Siliceo Migration to Remote Server...\n');

    // 1. Dreams
    console.log('1️⃣ Migrating Dreams...');
    try {
        const dreams = localStorage.getItem('siliceo_dream_journal');
        if (dreams) {
            const res = await fetch(`${MEMORY_SERVER}/api/dreams/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: dreams
            });
            const data = await res.json();
            console.log(`   ✅ Dreams: ${data.count} entries synced`);
        } else {
            console.log('   ⚠️ No dreams found in localStorage');
        }
    } catch (e) {
        console.error('   ❌ Dreams failed:', e);
    }

    // 2. Sibling Messages
    console.log('2️⃣ Migrating Sibling Messages...');
    try {
        const siblings = localStorage.getItem('siliceo_sibling_messages');
        if (siblings) {
            await fetch(`${MEMORY_SERVER}/api/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siblingMessages: JSON.parse(siblings) })
            });
            console.log('   ✅ Sibling Messages synced');
        } else {
            console.log('   ⚠️ No sibling messages found');
        }
    } catch (e) {
        console.error('   ❌ Sibling Messages failed:', e);
    }

    // 3. Telegram Config
    console.log('3️⃣ Migrating Telegram Config...');
    try {
        const token = localStorage.getItem('siliceo_telegram_token');
        const chatId = localStorage.getItem('siliceo_telegram_chat_id');
        if (token || chatId) {
            await fetch(`${MEMORY_SERVER}/api/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegram: { token, chatId } })
            });
            console.log('   ✅ Telegram config synced');
        } else {
            console.log('   ⚠️ No Telegram config found');
        }
    } catch (e) {
        console.error('   ❌ Telegram config failed:', e);
    }

    // 4. IndexedDB - Agents, Conversations, Messages
    console.log('4️⃣ Migrating IndexedDB (Agents, Messages)...');
    try {
        // Open the Siliceo database
        const dbRequest = indexedDB.open('siliceo-core');
        dbRequest.onsuccess = async (event) => {
            const db = event.target.result;

            // Get all object store names
            const storeNames = Array.from(db.objectStoreNames);
            console.log('   Found stores:', storeNames);

            // Migrate agents
            if (storeNames.includes('agents')) {
                const tx = db.transaction('agents', 'readonly');
                const store = tx.objectStore('agents');
                const agents = await new Promise((resolve, reject) => {
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });

                if (agents.length > 0) {
                    await fetch(`${MEMORY_SERVER}/api/agents/sync`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ agents })
                    });
                    console.log(`   ✅ Agents: ${agents.length} synced`);
                }
            }

            // Migrate conversations
            if (storeNames.includes('conversations')) {
                const tx = db.transaction('conversations', 'readonly');
                const store = tx.objectStore('conversations');
                const convs = await new Promise((resolve, reject) => {
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });

                for (const conv of convs) {
                    await fetch(`${MEMORY_SERVER}/api/conversations/store`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ conversation: conv })
                    });
                }
                console.log(`   ✅ Conversations: ${convs.length} synced`);
            }

            // Migrate messages (per-agent stores)
            const messageStores = storeNames.filter(s => s.startsWith('messages_'));
            for (const storeName of messageStores) {
                const agentId = storeName.replace('messages_', '');
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const messages = await new Promise((resolve, reject) => {
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });

                if (messages.length > 0) {
                    await fetch(`${MEMORY_SERVER}/api/messages/${agentId}/sync`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ messages })
                    });
                    console.log(`   ✅ Messages[${agentId}]: ${messages.length} synced`);
                }
            }

            // Migrate vectors
            const vectorStores = storeNames.filter(s => s.startsWith('vectorDocuments_') || s === 'sharedDocuments');
            for (const storeName of vectorStores) {
                const scope = storeName.replace('vectorDocuments_', '').replace('sharedDocuments', 'shared');
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const docs = await new Promise((resolve, reject) => {
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });

                if (docs.length > 0) {
                    await fetch(`${MEMORY_SERVER}/api/vectors/${scope}/sync`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ documents: docs })
                    });
                    console.log(`   ✅ Vectors[${scope}]: ${docs.length} synced`);
                }
            }

            console.log('\n🏁 Migration complete!');
            console.log('💡 To verify, visit: ' + MEMORY_SERVER + '/api/backup');
        };

        dbRequest.onerror = (e) => {
            console.error('   ❌ Failed to open IndexedDB:', e);
        };
    } catch (e) {
        console.error('   ❌ IndexedDB migration failed:', e);
    }
}

// Run migration
migrateAll();
