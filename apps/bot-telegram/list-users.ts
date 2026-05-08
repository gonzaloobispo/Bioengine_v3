import { initDB, db } from './src/memory/db.js';

async function listUsers() {
    await initDB();
    const snap = await db.collection('users').get();
    console.log(`--- Colección 'users': ${snap.size} usuarios ---`);
    snap.docs.forEach(doc => {
        console.log(` - ${doc.id}`);
    });
}

listUsers().catch(console.error);
