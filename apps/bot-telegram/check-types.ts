import { initDB, db } from './src/memory/db.js';

async function checkTypes() {
    await initDB();
    const uid = 'gonzalo-v4';
    const snap = await db.collection('users').doc(uid).collection('activities').get();
    
    const types = new Map<string, number>();
    snap.docs.forEach(doc => {
        const d = doc.data();
        const t = d.type || d.activity_type || d.activityType;
        types.set(t, (types.get(t) || 0) + 1);
    });
    
    console.log(`--- Types for ${uid} (${snap.size}) ---`);
    for (const [t, count] of types) {
        console.log(` - ${t}: ${count}`);
    }
}

checkTypes().catch(console.error);
