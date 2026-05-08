import { initDB, db } from './src/memory/db.js';

async function checkMigratedData() {
    await initDB();
    const uid = 'gonzalo-v4';
    console.log(`--- Checking Migrated Activities for: ${uid} ---`);

    const snap = await db.collection('users').doc(uid).collection('activities').limit(5).get();
    console.log(`Total docs found in user activities: ${snap.size}`);
    
    snap.forEach(doc => {
        console.log(`[${doc.id}] Data keys:`, Object.keys(doc.data()));
        console.log(`Sample data:`, JSON.stringify(doc.data()).substring(0, 150));
    });

    // Check if the APP uses a different collection name like 'activity' instead of 'activities'
    // but useBioEngineData.js says 'activities'.
}

checkMigratedData().catch(console.error);
