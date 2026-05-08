import { initDB, db } from './src/memory/db.js';

async function main() {
    await initDB();
    const userId = 'HTJlt5RxMjeJwZX9CHlPTeDzNfi1';
    const activitiesSnap = await db.collection('users').doc(userId).collection('activities')
        .limit(1)
        .get();

    activitiesSnap.forEach((doc: any) => {
        console.log(`Full Activity Data ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
    });
    process.exit(0);
}

main();
