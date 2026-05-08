import { initDB, db } from './src/memory/db.js';

async function checkDateKeys() {
    await initDB();
    const uid = 'gonzalo-v4';
    
    console.log(`--- Checking Activities in users/${uid}/activities ---`);
    const actSnap = await db.collection('users').doc(uid).collection('activities').limit(1).get();
    if (!actSnap.empty) {
        console.log(`Keys: ${Object.keys(actSnap.docs[0].data()).join(', ')}`);
    }

    console.log(`\n--- Checking Plans in users/${uid}/plans ---`);
    const planSnap = await db.collection('users').doc(uid).collection('plans').limit(1).get();
    if (!planSnap.empty) {
        console.log(`Keys: ${Object.keys(planSnap.docs[0].data()).join(', ')}`);
    }
}

checkDateKeys().catch(console.error);
