import { initDB } from './src/memory/db.js';
import admin from 'firebase-admin';

async function cleanup() {
    await initDB();
    const db = admin.firestore();
    const chatId = '8067043732';
    console.log(`Cleaning up messages for chat ${chatId}...`);
    const snapshot = await db.collection('messages').where('chatId', '==', chatId).get();
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log("Cleanup complete.");
}

cleanup();
