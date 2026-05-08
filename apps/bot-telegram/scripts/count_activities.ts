
import { initDB, db } from '../src/memory/db.js';

async function main() {
    await initDB();
    const userId = process.argv[2];
    if (!userId) {
        console.error('Missing userId');
        return;
    }
    
    const activities = await db.collection('users').doc(userId).collection('activities').get();
    console.log(`User ${userId} has ${activities.size} activities in Firestore.`);
    
    if (activities.size > 0) {
        const first = activities.docs[0].data();
        console.log('Sample activity:', JSON.stringify(first, null, 2));
    }
}

main().catch(console.error);
