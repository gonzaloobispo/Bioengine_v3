import { initDB, db } from './src/memory/db.js';

async function migrateEverything() {
    await initDB();
    const sourceUid = 'gonzalo-v4';
    const targetUid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    
    for (const coll of ['biometrics', 'daily_health', 'metrics', 'pain_logs']) {
        const snap = await db.collection('users').doc(sourceUid).collection(coll).get();
        console.log(`Migrating ${snap.size} from ${coll}...`);
        
        const batch = db.batch();
        snap.docs.forEach(doc => {
            batch.set(db.collection('users').doc(targetUid).collection(coll).doc(doc.id), doc.data(), { merge: true });
        });
        if (!snap.empty) await batch.commit();
    }
    console.log('✅ Sincronización completa de salud y biometría finalizada.');
}

migrateEverything().catch(console.error);
