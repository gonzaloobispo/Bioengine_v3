import { initDB, db } from './src/memory/db.js';

async function checkMigratedData() {
    await initDB();
    const uid = 'gonzalo-v4';
    console.log(`--- Checking Migrated Activities for: ${uid} ---`);

    const snap = await db.collection('users').doc(uid).collection('activities').limit(5).get();
    
    snap.forEach(doc => {
        console.log(`[${doc.id}] Keys: ${Object.keys(doc.data()).join(', ')}`);
        const d = doc.data();
        console.log(`  activityId: ${d.activityId}, duration: ${d.durationMinutes}, date/time keys: ${['start_time', 'startTimeLocal', 'startTimeGMT', 'timestamp', 'date', 'fecha'].filter(k => d[k]).join(', ')}`);
    });
}

checkMigratedData().catch(console.error);
