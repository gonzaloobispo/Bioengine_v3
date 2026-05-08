import { initDB, db } from './src/memory/db.js';

async function migrate() {
    await initDB();
    const uid = 'gonzalo-v4';
    const userRef = db.collection('users').doc(uid);

    const collectionsToMigrate = ['activities', 'plans', 'biometrics', 'daily_health'];

    for (const collName of collectionsToMigrate) {
        console.log(`\nMigrating '${collName}'...`);
        const rootSnap = await db.collection(collName).get();
        console.log(`Found ${rootSnap.size} docs in root ${collName}.`);

        const batch = db.batch();
        rootSnap.forEach(rootDoc => {
            const data = rootDoc.data();
            const targetRef = userRef.collection(collName).doc(rootDoc.id);
            batch.set(targetRef, { ...data, userId: uid }, { merge: true });
            console.log(`- Queued migration of ${rootDoc.id}`);
        });

        if (rootSnap.size > 0) {
            await batch.commit();
            console.log(`✅ Migrated ${collName} to users/${uid}`);
        }
    }
    
    console.log('\n--- Migration Complete ---');
}

migrate().catch(console.error);
