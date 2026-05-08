
import { initDB, db } from '../src/memory/db.js';

async function main() {
    await initDB();
    const userId = process.argv[2];
    if (!userId) {
        console.error('Missing userId');
        return;
    }
    
    const gear = await db.collection('users').doc(userId).collection('gear').get();
    console.log(`User ${userId} has ${gear.size} gear items in Firestore.`);
    
    for (const doc of gear.docs) {
        console.log(`Gear ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
    }
}

main().catch(console.error);
