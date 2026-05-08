import { db, initDB } from './src/memory/db.js';

async function check() {
    try {
        await initDB();
        const userId = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
        const doc = await db.collection('users').doc(userId).get();
        if (!doc.exists) {
            console.log('User not found');
        } else {
            const data = doc.data() || {};
            console.log(`User status: ${data.status}`);
            console.log(`Profile status: ${data.profile?.status}`);
        }
        process.exit(0);
    } catch (err: any) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
