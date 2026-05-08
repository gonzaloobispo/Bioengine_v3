import { initDB, db } from './src/memory/db.js';

async function checkActivitiesDetailed() {
    await initDB();
    const targetUid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    
    console.log(`--- Checking Activities for ${targetUid} ---`);
    const snap = await db.collection('users').doc(targetUid).collection('activities').get();
    
    console.log(`Total activities found: ${snap.size}`);
    
    const types = new Set();
    const samples: any[] = [];
    
    snap.forEach(doc => {
        const d = doc.data();
        const type = d.type || d.name || 'unknown';
        types.add(type);
        if (samples.length < 5) samples.push({ id: doc.id, type, name: d.name, timestamp: d.timestamp });
    });
    
    console.log(`Activity Types found: ${Array.from(types).join(', ')}`);
    console.log('Samples:', JSON.stringify(samples, null, 2));
}

checkActivitiesDetailed().catch(console.error);
