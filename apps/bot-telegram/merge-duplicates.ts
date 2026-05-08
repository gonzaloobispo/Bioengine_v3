import { initDB, db } from './src/memory/db.js';

async function mergeDuplicates() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    const snap = await db.collection('users').doc(uid).collection('activities').orderBy('timestamp', 'asc').get();
    
    console.log(`--- Buscando duplicados en ${snap.size} actividades ---`);
    const docs = snap.docs;
    const toDelete: string[] = [];
    let mergedCount = 0;
    
    for (let i = 0; i < docs.length - 1; i++) {
        const d1 = docs[i].data();
        const d2 = docs[i+1].data();
        
        const t1 = d1.timestamp?.toMillis ? d1.timestamp.toMillis() : new Date(d1.timestamp).getTime();
        const t2 = d2.timestamp?.toMillis ? d2.timestamp.toMillis() : new Date(d2.timestamp).getTime();
        
        // Criterio: Mismo tipo y misma hora (exacta o +/- 10 segundos)
        if (d1.type === d2.type && Math.abs(t1 - t2) < 10000) {
            console.log(`Duplicado encontrado: ${d1.type} en ${new Date(t1).toISOString()}`);
            
            // Mergear d2 hacia d1 si d1 tiene campos faltantes
            const updates: any = {};
            if (!d1.duration_minutes && d2.duration_minutes) updates.duration_minutes = d2.duration_minutes;
            if (!d1.distance_km && d2.distance_km) updates.distance_km = d2.distance_km;
            if (!d1.calories && d2.calories) updates.calories = d2.calories;
            
            if (Object.keys(updates).length > 0) {
                await docs[i].ref.update(updates);
                console.log(` -> Actualizado doc ${docs[i].id} con datos de ${docs[i+1].id}`);
            }
            
            toDelete.push(docs[i+1].id);
            mergedCount++;
            i++; // Saltar el siguiente ya que fue procesado
        }
    }
    
    if (toDelete.length > 0) {
        console.log(`Eliminando ${toDelete.length} duplicados...`);
        const batch = db.batch();
        toDelete.forEach(id => {
            batch.delete(db.collection('users').doc(uid).collection('activities').doc(id));
        });
        await batch.commit();
        console.log('✅ Duplicados eliminados.');
    } else {
        console.log('No se encontraron duplicados.');
    }
}

mergeDuplicates().catch(console.error);
