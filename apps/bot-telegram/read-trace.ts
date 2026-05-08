import { initDB, db } from './src/memory/db.js';

async function checkDebug() {
    await initDB();
    const d = await db.collection('debug_sessions').doc('last').get();
    if (d.exists) {
        console.log('TRACE ENCONTRADO:', JSON.stringify(d.data(), null, 2));
    } else {
        console.log('No trace found in debug_sessions/last');
    }
}

checkDebug().catch(console.error);
