
import { initDB, db } from '../src/memory/db.js';

async function main() {
    await initDB();
    const userId = process.argv[2];
    if (!userId) {
        console.error('Missing userId');
        return;
    }
    
    const activities = await db.collection('users').doc(userId).collection('activities').get();
    console.log(`Checking ${activities.size} activities for gear...`);
    
    let found = 0;
    for (const doc of activities.docs) {
        const data = doc.data();
        if (data.gearName || data.gearUuid || data.equipmentId || data.gear) {
            console.log(`Found gear in activity ${doc.id}:`, JSON.stringify(data, null, 2));
            found++;
        }
    }
    console.log(`Total activities with gear: ${found}`);
}

main().catch(console.error);
