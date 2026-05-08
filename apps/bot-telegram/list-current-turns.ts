import { initDB, db } from './src/memory/db.js';

async function listCurrentTurns() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    const snap = await db.collection('chats').doc(uid).collection('turns').orderBy('createdAt', 'desc').get();
    
    console.log(`--- Turns for ${uid} (${snap.size}) ---`);
    snap.docs.forEach(doc => {
        const d = doc.data();
        console.log(` - ${doc.id}: [${d.status}] -> User: ${d.userMessage?.substring(0, 50)}...`);
        if (d.error) console.log(`   ERROR: ${d.error}`);
    });
}

listCurrentTurns().catch(console.error);
