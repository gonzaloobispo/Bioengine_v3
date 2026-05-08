import { db, initDB } from './src/memory/db.js';

async function check() {
    try {
        await initDB();
        const userId = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
        const doc = await db.collection('users').doc(userId).collection('status').doc('coach').get();
        if (!doc.exists) {
            console.log('Coach status not found');
        } else {
            console.log('Coach status:', JSON.stringify(doc.data(), null, 2));
        }
        process.exit(0);
    } catch (err: any) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
