import { initDB, db } from './src/memory/db.js';

async function checkCycling() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    const snap = await db.collection('users').doc(uid).collection('activities').where('type', '==', 'Ciclismo').get();
    
    console.log(`--- Analizando ${snap.size} actividades de Ciclismo ---`);
    snap.docs.forEach(doc => {
        const d = doc.data();
        if ((d.distance_km || d.distanceKm || 0) === 0) {
            console.log(`Doc ID ${doc.id}: Distancia 0. Campos:`, Object.keys(d));
        }
    });
}

checkCycling().catch(console.error);
