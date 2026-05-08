import { initDB, db } from './src/memory/db.js';

async function deepMerge() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    const snap = await db.collection('users').doc(uid).collection('activities').orderBy('timestamp', 'asc').get();
    
    console.log(`--- Deep Merge: Analizando ${snap.size} actividades ---`);
    const docs = snap.docs;
    const toDelete: string[] = [];
    
    for (let i = 0; i < docs.length; i++) {
        const d1 = docs[i].data();
        if (toDelete.includes(docs[i].id)) continue;

        const t1 = d1.timestamp?.toMillis ? d1.timestamp.toMillis() : new Date(d1.timestamp).getTime();

        for (let j = i + 1; j < docs.length; j++) {
            const d2 = docs[j].data();
            if (toDelete.includes(docs[j].id)) continue;

            const t2 = d2.timestamp?.toMillis ? d2.timestamp.toMillis() : new Date(d2.timestamp).getTime();
            
            // Si están a menos de 5 minutos O tienen la misma distancia exacta
            const timeSame = Math.abs(t1 - t2) < 300000; // 5 mins
            const distSame = d1.distance_km > 0 && d1.distance_km === d2.distance_km;

            if (d1.type === d2.type && (timeSame || distSame)) {
                console.log(`Posible duplicado: ${d1.type} en ${new Date(t1).toISOString()} (TimeDiff: ${Math.round(Math.abs(t1-t2)/1000)}s, DistSame: ${distSame})`);
                
                const updates: any = {};
                if (!d1.duration_minutes && d2.duration_minutes) updates.duration_minutes = d2.duration_minutes;
                if (!d1.distance_km && d2.distance_km) updates.distance_km = d2.distance_km;
                if ((!d1.calories || d1.calories === 0) && d2.calories > 0) updates.calories = d2.calories;
                
                // Mantiene el que tenga MÁS campos o sea el "maestro" de Garmin
                if (Object.keys(updates).length > 0) {
                    await docs[i].ref.update(updates);
                    console.log(` -> Combinando ${docs[j].id} en ${docs[i].id}`);
                }
                
                toDelete.push(docs[j].id);
            }
        }
    }
    
    if (toDelete.length > 0) {
        console.log(`Eliminando ${toDelete.length} fragmentos duplicados...`);
        const batch = db.batch();
        // Firebase limits batches to 500
        toDelete.forEach((id, idx) => {
            batch.delete(db.collection('users').doc(uid).collection('activities').doc(id));
            if ((idx + 1) % 400 === 0) { console.log('Commiting partial batch...'); }
        });
        await batch.commit();
        console.log('✅ Base de datos saneada.');
    } else {
        console.log('No se encontraron fragmentos para combinar.');
    }
}

deepMerge().catch(console.error);
