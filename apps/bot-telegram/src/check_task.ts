
import { db, initDB } from './memory/db.js';

async function checkSubAgent() {
    await initDB();
    const tasksRef = db.collection('delegated_tasks');
    const snapshot = await tasksRef.orderBy('createdAt', 'desc').limit(5).get();

    snapshot.forEach((doc: any) => {
        const data = doc.data();
        console.log(`Task ID: ${doc.id}`);
        console.log(`Status: ${data.status}`);
        console.log(`Summary: ${data.summary}`);
        if (data.result) {
            console.log(`Result: ${JSON.stringify(data.result).substring(0, 200)}...`);
        }
        console.log('---');
    });
}

checkSubAgent();
