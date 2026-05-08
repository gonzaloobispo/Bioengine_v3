import { initDB } from './src/memory/db.js';
import admin from 'firebase-admin';

async function listAll() {
    await initDB();
    const db = admin.firestore();
    console.log("--- MESSAGES ---");
    const snapshot = await db.collection('messages').orderBy('timestamp', 'desc').limit(20).get();
    snapshot.forEach(doc => {
        const d = doc.data();
        console.log(`[${d.role}] ${d.content?.substring(0, 50)}... calls:${!!d.tool_calls} resultOf:${d.tool_call_id}`);
    });
}

listAll();
