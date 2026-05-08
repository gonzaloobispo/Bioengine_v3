import { initDB, db } from './src/memory/db.js';

async function checkSpecificChats() {
    await initDB();
    const ids = ['gonzalo-v4', 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2'];
    for (const id of ids) {
        const snap = await db.collection('chats').doc(id).collection('turns').limit(1).get();
        console.log(`Turns for ${id} count: ${snap.size}`);
    }
}

checkSpecificChats().catch(console.error);
