import { initDB, db } from './src/memory/db.js';

async function verifyData() {
    await initDB();
    const uid = 'gonzalo-v4';
    console.log(`--- Checking data for user: ${uid} ---`);

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
        console.log('❌ User doc NOT found for gonzalo-v4');
    } else {
        console.log('✅ User doc found:', JSON.stringify(userDoc.data()).substring(0, 200));
    }

    const collections = ['activities', 'biometrics', 'plans', 'daily_health'];
    for (const coll of collections) {
        const snap = await db.collection('users').doc(uid).collection(coll).limit(3).get();
        console.log(`- Collection '${coll}': ${snap.size} documents found.`);
        snap.forEach(doc => {
            console.log(`  [${doc.id}]: ${JSON.stringify(doc.data()).substring(0, 100)}...`);
        });
    }

    // Check if there is another user that might be the REAL one
    const usersSnap = await db.collection('users').get();
    console.log(`--- All users in system: ${usersSnap.size} ---`);
    usersSnap.forEach(doc => {
        const data = doc.data();
        console.log(`- ${doc.id}: ${data.email || 'no email'} (${data.nombre || 'no name'})`);
    });
}

verifyData().catch(console.error);
