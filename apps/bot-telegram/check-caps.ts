import { initDB, db } from './src/memory/db.js';

async function checkCaps() {
    await initDB();
    const low = await db.collection('users').doc('o9Jhw8cQyANOrWrh0j1GdtCvSGT2').get();
    const up = await db.collection('users').doc('O9Jhw8cQyANOrWrh0j1GdtCvSGT2').get();
    
    console.log('Lowercase (o) exists:', low.exists);
    console.log('Uppercase (O) exists:', up.exists);
    
    if (up.exists) {
        const upCount = await db.collection('users').doc('O9Jhw8cQyANOrWrh0j1GdtCvSGT2').collection('activities').get().then(s => s.size);
        console.log('Uppercase activities count:', upCount);
    }
    if (low.exists) {
        const lowCount = await db.collection('users').doc('o9Jhw8cQyANOrWrh0j1GdtCvSGT2').collection('activities').get().then(s => s.size);
        console.log('Lowercase activities count:', lowCount);
    }
}

checkCaps().catch(console.error);
