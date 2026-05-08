import { initDB, db } from './src/memory/db.js';

async function fixKeys() {
    await initDB();
    const uid = 'gonzalo-v4';
    const userRef = db.collection('users').doc(uid);

    console.log('--- Fixing Activities ---');
    const actSnap = await userRef.collection('activities').get();
    const actBatch = db.batch();
    let actFixCount = 0;
    actSnap.forEach(doc => {
        const d = doc.data();
        if (!d.start_time && d.timestamp) {
            actBatch.update(doc.ref, { start_time: d.timestamp });
            actFixCount++;
        }
    });
    if (actFixCount > 0) await actBatch.commit();
    console.log(`✅ Fixed ${actFixCount} activities with start_time.`);

    console.log('\n--- Fixing Plans ---');
    const planSnap = await userRef.collection('plans').get();
    const planBatch = db.batch();
    let planFixCount = 0;
    planSnap.forEach(doc => {
        const d = doc.data();
        if (!d.startDate && (d.createdAt || d.updated_at)) {
            const date = d.createdAt || d.updated_at;
            planBatch.update(doc.ref, { startDate: date });
            planFixCount++;
        }
    });
    if (planFixCount > 0) await planBatch.commit();
    console.log(`✅ Fixed ${planFixCount} plans with startDate.`);
}

fixKeys().catch(console.error);
