import { initDB, db } from './src/memory/db.js';

async function checkDoc() {
    await initDB();
    const d = await db.collection('users').doc('o9Jhw8cQyANOrWrh0j1GdtCvSGT2').collection('activities').doc('1').get();
    if (d.exists) {
        console.log(JSON.stringify(d.data(), null, 2));
    } else {
        console.log('Doc 1 not found.');
    }
}

checkDoc().catch(console.error);
