import { processTurn } from './src/agent/worker.js';
import { initDB, db } from './src/memory/db.js';

async function fullAgentTest() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';

    // FIX DISTANCE MULTIPLIER MISTAKE FIRST
    console.log("--- Fixing distance bug... ---");
    const snap = await db.collection('users').doc(uid).collection('activities').get();
    const batch = db.batch();
    let c = 0;
    snap.docs.forEach(d => {
        const data = d.data();
        if (data.distanceKm > 1 && data.distance_km < 1) {
            batch.update(d.ref, { distance_km: data.distanceKm });
            c++;
        }
    });
    if (c > 0) {
        await batch.commit();
        console.log(`Corregidas ${c} actividades con la distancia rota por la migración.`);
    }

    console.log("--- 🕵️‍♂️ Enviando mensaje al AI Coach... ---");

    await db.collection('chats').doc(uid).collection('turns').doc('dummy_test_123').set({
        source: 'web',
        userMessage: 'Busca mi ultima actividad de ciclismo',
        status: 'RECEIVED',
        createdAt: new Date()
    });

    const result = await processTurn(uid, 'dummy_test_123', "Busca mi ultima actividad de ciclismo");
    
    console.log("\n====== 🤖 RESPUESTA DEL AI COACH ======");
    console.log(result.finalResponse);
    console.log("=======================================\n");
}

fullAgentTest().catch(console.error);

fullAgentTest().catch(console.error);
