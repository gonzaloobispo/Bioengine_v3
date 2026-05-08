import { initDB, db } from './src/memory/db.js';

async function listChats() {
    await initDB();
    const snap = await db.collection('chats').get();
    
    console.log(`--- Listando ${snap.size} chats ---`);
    snap.docs.forEach(doc => {
        console.log(` - ID: ${doc.id}`);
    });
}

listChats().catch(console.error);
