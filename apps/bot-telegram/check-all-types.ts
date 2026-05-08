import { initDB, db } from './src/memory/db.js';

async function checkTypes() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    const snap = await db.collection('users').doc(uid).collection('activities').get();
    
    console.log(`--- Analizando ${snap.size} actividades totales ---`);
    const types: any = {};
    snap.docs.forEach(doc => {
        const t = doc.data().type || doc.data().activity_type || 'Desconocido';
        types[t] = (types[t] || 0) + 1;
    });
    console.log('Tipos detectados:', types);
}

checkTypes().catch(console.error);
