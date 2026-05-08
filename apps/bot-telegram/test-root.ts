import { initDB, db } from './src/memory/db.js';

async function checkRootActivities() {
    await initDB();
    console.log(`--- Checking Root 'activities' collection ---`);

    const snap = await db.collection('activities').get();
    console.log(`Total docs in root activities: ${snap.size}`);
    snap.forEach(doc => {
        console.log(`- ${doc.id}: ${JSON.stringify(doc.data()).substring(0, 200)}...`);
    });

    console.log(`--- Checking 'messages' to see context ---`);
    const msgSnap = await db.collection('messages').orderBy('timestamp', 'desc').limit(5).get();
    msgSnap.forEach(doc => {
        const d = doc.data();
        console.log(`[${d.role}] ${d.content}`);
    });
}

checkRootActivities().catch(console.error);
