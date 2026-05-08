import { initDB, db } from './src/memory/db.js';

async function unifyUser() {
    await initDB();
    const sourceUid = 'gonzalo-v4';
    const targetUid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';

    console.log(`--- Unificando datos de ${sourceUid} a ${targetUid} ---`);

    const sourceRef = db.collection('users').doc(sourceUid);
    const targetRef = db.collection('users').doc(targetUid);

    // 1. Move root info (last sync, etc)
    const sourceData = (await sourceRef.get()).data();
    if (sourceData) {
        await targetRef.set({ ...sourceData, role: 'admin', status: 'active' }, { merge: true });
        console.log('✅ Perfil base unificado.');
    }

    const collections = ['activities', 'plans', 'biometrics', 'daily_health', 'secrets'];
    
    for (const collName of collections) {
        const snap = await sourceRef.collection(collName).get();
        console.log(`Moviendo ${snap.size} docs en subcolección '${collName}'...`);
        
        const batch = db.batch();
        snap.forEach(doc => {
            batch.set(targetRef.collection(collName).doc(doc.id), { ...doc.data(), userId: targetUid }, { merge: true });
        });

        if (snap.size > 0) {
            await batch.commit();
            console.log(`✅ Colección '${collName}' migrada.`);
        }
    }
    
    console.log('\n🎉 UNIFICACIÓN COMPLETA');
}

unifyUser().catch(console.error);
