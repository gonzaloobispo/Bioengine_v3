import { initDB, db } from './src/memory/db.js';

async function run() {
    await initDB();
    const snap = await db.collection('users').doc('gonzalo-v4').collection('biometrics').get();
    console.log('Biometrics count:', snap.size);
    const snap2 = await db.collection('users').doc('gonzalo-v4').collection('metrics').get();
    console.log('Metrics count:', snap2.size);
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
