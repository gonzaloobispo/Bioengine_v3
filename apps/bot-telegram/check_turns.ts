import { db, initDB } from './src/memory/db.js';
import * as admin from 'firebase-admin';

async function check() {
    try {
        await initDB();
        const snap = await db.collection('turns').where('chatId', '==', '8067043732').limit(10).get();
        if (snap.empty) {
            console.log("No turns found for this chatId.");
        }
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`--- Turn ${doc.id} ---`);
            console.log(`Status: ${data.status}`);
            console.log(`User Message: ${data.userMessage}`);
            console.log(`Updated At: ${data.updatedAt?.toDate().toISOString()}`);
            if (data.errorMessage) console.log(`Error: ${data.errorMessage}`);
            console.log('-------------------');
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
