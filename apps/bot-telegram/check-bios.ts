import { initDB, db } from './src/memory/db.js';

async function checkBiometrics() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    const snap = await db.collection('users').doc(uid).collection('biometrics').orderBy('date', 'desc').get();
    
    console.log(`--- Biometría: ${snap.size} registros ---`);
    snap.docs.forEach(doc => {
        const d = doc.data();
        console.log(` - ${d.date}: ${d.weight_kg || d.peso} kg`);
    });
}

checkBiometrics().catch(console.error);
