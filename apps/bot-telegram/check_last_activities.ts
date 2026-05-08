import { db, initDB } from './src/memory/db.js';

async function check() {
    try {
        await initDB();
        const userId = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
        
        console.log(`Checking last 5 activities for user: ${userId}`);
        const snap = await db.collection('users').doc(userId).collection('activities')
            .orderBy('start_time', 'desc')
            .limit(5)
            .get();
        
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`- [${data.start_time}] ${data.name} (${data.type}) - Source: ${data.source}`);
        });

        process.exit(0);
    } catch (err: any) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
