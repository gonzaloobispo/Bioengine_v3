import { initDB } from '../src/memory/db.js';
import { getFirestore } from 'firebase-admin/firestore';

async function main() {
    await initDB();
    const db = getFirestore();
    await db.collection('users').doc('o9Jhw8cQyANOrWrh0j1GdtCvSGT2').collection('secrets').doc('garmin_oauth').delete();
    console.log('Deleted garmin_oauth');
    process.exit(0);
}
main();
