import { initDB, db } from './src/memory/db.js';

async function main() {
    await initDB();
    const telegramId = '666324835'; // User ID from logs
    const userSnap = await db.collection('users').where('telegram_id', '==', telegramId).get();
    if (userSnap.empty) {
        console.log('User not found');
        return;
    }
    const userId = userSnap.docs[0].id;
    console.log(`Found User Firestore ID: ${userId}`);

    const activitiesSnap = await db.collection('users').doc(userId).collection('activities')
        .orderBy('timestamp', 'desc')
        .limit(3)
        .get();

    activitiesSnap.forEach((doc: any) => {
        console.log(`Activity ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
    });
    process.exit(0);
}

main();
