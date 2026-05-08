import { initDB, db } from './src/memory/db.js';
import { Timestamp } from 'firebase-admin/firestore';

async function convertTimestamps() {
    await initDB();
    const targetUid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    
    console.log(`--- Convertiendo timestamps para ${targetUid} ---`);
    const snap = await db.collection('users').doc(targetUid).collection('activities').get();
    
    let count = 0;
    const batchSize = 400;
    let batch = db.batch();
    
    for (const doc of snap.docs) {
        const d = doc.data();
        let updated = false;
        const updateData: any = {};

        // Convert timestamp if string
        if (typeof d.timestamp === 'string') {
            updateData.timestamp = Timestamp.fromDate(new Date(d.timestamp));
            updated = true;
        }

        // Also start_time
        if (typeof d.start_time === 'string') {
            updateData.start_time = Timestamp.fromDate(new Date(d.start_time));
            updated = true;
        }

        if (updated) {
            batch.update(doc.ref, updateData);
            count++;
            if (count % batchSize === 0) {
                await batch.commit();
                batch = db.batch();
                console.log(`... ${count} docs procesados`);
            }
        }
    }
    
    if (count % batchSize !== 0) {
        await batch.commit();
    }
    
    console.log(`\n✅ CONVERSIÓN COMPLETADA: ${count} actividades actualizadas.`);
}

convertTimestamps().catch(console.error);
