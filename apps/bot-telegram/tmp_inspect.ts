import { initDB, db } from './src/memory/db.js';

async function run() {
    await initDB();
    const snap = await db.collection('users').doc('gonzalo-v4').collection('biometrics')
      .orderBy('timestamp', 'desc').limit(1).get();
    
    if (snap.empty) {
        console.log('No biometrics found in gonzalo-v4');
    } else {
        console.log('Sample Biometric:', JSON.stringify(snap.docs[0].data(), null, 2));
    }
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
