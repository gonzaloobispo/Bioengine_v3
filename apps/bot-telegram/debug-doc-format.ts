import { initDB, db } from './src/memory/db.js';

async function debugDoc() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    const snap = await db.collection('users').doc(uid).collection('activities').limit(1).get();
    
    if (snap.empty) {
        console.log('No activities found for UID:', uid);
        return;
    }
    
    const d = snap.docs[0].data();
    console.log('Doc ID:', snap.docs[0].id);
    console.log('start_time type:', typeof d.start_time);
    console.log('start_time value:', d.start_time);
    if (d.start_time && d.start_time.toDate) {
        console.log('start_time.toDate():', d.start_time.toDate());
    }
    console.log('timestamp value:', d.timestamp);
}

debugDoc().catch(console.error);
