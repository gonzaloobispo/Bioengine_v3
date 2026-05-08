import { initDB, linkTelegramId } from './db.js';

async function run() {
    await initDB();
    // Assuming the user logged in and has a UID. 
    // If I don't know it, I can't link it.
    // I'll wait for the user to login and give me the UID or I'll look it up by email.

    // Actually, I can search for the user by email in Firestore.
    const { db } = await import('./db.js');
    const userSnapshot = await db.collection('users').where('email', '==', 'gonzalo.obispo@gmail.com').get();

    if (userSnapshot.empty) {
        console.error('User with email gonzalo.obispo@gmail.com not found in Firestore. Please login to BioEngine first.');
        process.exit(1);
    }

    const webUid = userSnapshot.docs[0].id;
    const telegramId = '8067043732';

    await linkTelegramId(telegramId, webUid);
    console.log(`Successfully linked Telegram ID ${telegramId} to Web UID ${webUid}`);
}

run().catch(console.error);
