import { initDB, db } from './src/memory/db.js';

async function main() {
    await initDB();
    const userId = 'HTJlt5RxMjeJwZX9CHlPTeDzNfi1';
    console.log(`Checking activities for User: ${userId}`);

    const activitiesSnap = await db.collection('users').doc(userId).collection('activities')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();

    console.log(`Found ${activitiesSnap.size} activities`);
    activitiesSnap.forEach((doc: any) => {
        const data = doc.data();
        console.log(`Activity ${doc.id}: ${data.tipo} - ${data.fecha} - Cadencia: ${data.cadencia_media}`);
    });
    process.exit(0);
}

main();
