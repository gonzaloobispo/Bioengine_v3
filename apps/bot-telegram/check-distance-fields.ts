import { initDB, db } from './src/memory/db.js';

async function checkFields() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    const snap = await db.collection('users').doc(uid).collection('activities').limit(50).get();
    
    console.log('--- Analizando campos de distancia ---');
    const fieldCounts: any = {};
    snap.docs.forEach(doc => {
        const d = doc.data();
        Object.keys(d).forEach(k => {
            if (k.toLowerCase().includes('dist')) {
                fieldCounts[k] = (fieldCounts[k] || 0) + 1;
                if (d[k] > 0) console.log(`Doc ${doc.id}: ${k} = ${d[k]}`);
            }
        });
    });
    console.log('Campos detectados:', fieldCounts);
}

checkFields().catch(console.error);
