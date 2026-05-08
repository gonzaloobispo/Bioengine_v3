import { initDB, db } from './src/memory/db.js';

async function main() {
    await initDB();
    const snapshot = await db.collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();

    console.log('--- LATEST 5 MESSAGES ---');
    snapshot.forEach((doc: any) => {
        const data = doc.data();
        console.log(`[${data.timestamp?.toDate().toISOString()}] [${data.role}] ${data.content?.substring(0, 50)}...`);
    });
    process.exit(0);
}

main();
