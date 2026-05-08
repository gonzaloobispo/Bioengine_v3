import { initDB, db } from './src/memory/db.js';

async function listCollections() {
    await initDB();
    const uid = 'gonzalo-v4';
    const userRef = db.collection('users').doc(uid);
    const collections = await userRef.listCollections();
    
    console.log(`Collections for ${uid}:`);
    for (const coll of collections) {
        const snap = await coll.limit(1).get();
        console.log(`- ${coll.id}: ${snap.size} docs`);
    }

    const rootCollections = await db.listCollections();
    console.log(`Root Collections:`);
    for (const coll of rootCollections) {
        const snap = await coll.limit(1).get();
        console.log(`- ${coll.id}: ${snap.size} docs`);
    }
}

listCollections().catch(console.error);
