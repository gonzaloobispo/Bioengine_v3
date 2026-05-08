import { initDB, db } from './src/memory/db.js';

async function resetTurns() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    const snap = await db.collection('chats').doc(uid).collection('turns').where('status', '==', 'PENDING_LLM').get();
    
    console.log(`--- Reseteando ${snap.size} turns colgados ---`);
    const batch = db.batch();
    snap.docs.forEach(doc => {
        batch.update(doc.ref, { 
            status: 'COMPLETED', 
            finalResponse: '🛠️ BioEngine Coach: Se ha realizado una limpieza y normalización profunda de tus datos. Por favor, intenta tu consulta de nuevo.' 
        });
    });
    
    if (!snap.empty) {
        await batch.commit();
        console.log('✅ Turns reseteados con éxito.');
    } else {
        console.log('No se encontraron turns colgados.');
    }
}

resetTurns().catch(console.error);
