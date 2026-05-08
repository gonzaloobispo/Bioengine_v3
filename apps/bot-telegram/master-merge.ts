import { initDB, db } from './src/memory/db.js';

async function masterMerge() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    const activitiesRef = db.collection('users').doc(uid).collection('activities');
    const snap = await activitiesRef.orderBy('timestamp', 'asc').get();
    
    console.log(`--- Master Merge: Procesando ${snap.size} actividades ---`);
    const docs = snap.docs;
    const items = docs.map(d => ({ id: d.id, data: d.data(), ref: d.ref }));
    const toDelete: string[] = [];
    const mergedCount: { [key: string]: number } = {};

    for (let i = 0; i < items.length; i++) {
        if (toDelete.includes(items[i].id)) continue;
        const main = items[i];
        const mData = main.data;
        const mTime = mData.timestamp?.toMillis ? mData.timestamp.toMillis() : new Date(mData.timestamp || mData.start_time || mData.fecha).getTime();

        for (let j = i + 1; j < items.length; j++) {
            if (toDelete.includes(items[j].id)) continue;
            const other = items[j];
            const oData = other.data;
            const oTime = oData.timestamp?.toMillis ? oData.timestamp.toMillis() : new Date(oData.timestamp || oData.start_time || oData.fecha).getTime();

            // Criterio de Fusión: Mismo tipo y mismo día/hora (margen de 10 min)
            const typeMatch = mData.type === oData.type || (mData.activity_type === oData.activity_type && mData.activity_type);
            const timeMatch = Math.abs(mTime - oTime) < 600000; // 10 mins

            if (typeMatch && timeMatch) {
                console.log(`Fusión detectada: ${mData.type} el ${new Date(mTime).toLocaleDateString()}`);
                
                const updates: any = {};
                // Combinar campos si el principal está vacío/cero y el segundo tiene datos
                const mergeFields = ['distance_km', 'duration_minutes', 'calories', 'avg_heart_rate', 'max_heart_rate', 'elevation_gain', 'cadence_avg'];
                
                mergeFields.forEach(field => {
                    const valMain = Number(mData[field] || 0);
                    const valOther = Number(oData[field] || 0);
                    if (valMain === 0 && valOther > 0) {
                        updates[field] = valOther;
                        mData[field] = valOther; // Update local for subsequent merges in this loop
                    }
                });

                // Si se detectaron mejoras, guardar
                if (Object.keys(updates).length > 0) {
                    await main.ref.update(updates);
                    console.log(` -> Actualizado ${main.id} con datos de ${other.id}`);
                }

                toDelete.push(other.id);
                mergedCount[mData.type] = (mergedCount[mData.type] || 0) + 1;
            }
        }
    }

    if (toDelete.length > 0) {
        console.log(`Eliminando ${toDelete.length} registros redundantes...`);
        // Eliminar en lotes de 400
        for (let i = 0; i < toDelete.length; i += 400) {
            const batch = db.batch();
            const chunk = toDelete.slice(i, i + 400);
            chunk.forEach(id => {
                batch.delete(activitiesRef.doc(id));
            });
            await batch.commit();
            console.log(`Batch ${i/400 + 1} completado.`);
        }
        console.log('✅ Base de datos saneada con éxito.');
        console.log('Resumen de fusiones:', mergedCount);
    } else {
        console.log('No se encontraron registros para fusionar.');
    }
}

masterMerge().catch(console.error);
