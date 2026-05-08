import { initDB, db } from './src/memory/db.js';

async function wipeTurns() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    
    const snap = await db.collection('chats').doc(uid).collection('turns').get();
    console.log(`Wiping ${snap.size} corrupted turns...`);
    
    // We wipe in batches of 500
    let count = 0;
    let batch = db.batch();
    for (const doc of snap.docs) {
        batch.delete(doc.ref);
        count++;
        if (count % 400 === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }
    if (count % 400 !== 0) {
        await batch.commit();
    }
    console.log('✅ Historial de chat purgado exitosamente. El dashboard ahora cargará una sesión limpia.');
}

wipeTurns().catch(console.error);
