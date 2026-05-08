import { initDB, db } from './src/memory/db.js';

async function activityIdMerge() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    const activitiesRef = db.collection('users').doc(uid).collection('activities');
    const snap = await activitiesRef.get();
    
    console.log(`--- ID Merge: Procesando ${snap.size} actividades ---`);
    const map = new Map<string, any[]>();
    
    snap.docs.forEach(doc => {
        const d = doc.data();
        const id = d.activityId || d.id || d.garminId;
        if (id) {
            if (!map.has(id.toString())) map.set(id.toString(), []);
            map.get(id.toString())?.push({ id: doc.id, data: d, ref: doc.ref });
        }
    });

    for (const [id, docs] of map.entries()) {
        if (docs.length > 1) {
            console.log(`\nDuplicado encontrado ID ${id} (${docs.length} versiones)`);
            const main = docs[0];
            const updates: any = {};
            
            for (let i = 1; i < docs.length; i++) {
                const other = docs[i];
                console.log(` -> Fusionando ${other.id} en ${main.id}`);
                
                // Unificar campos de interés
                const fields = [
                    'distance_km', 'distanceKm', 'duration_minutes', 'durationMinutes', 
                    'calories', 'calories_kcal', 'elapsed_time', 'elapsedTime',
                    'avg_heart_rate', 'max_heart_rate', 'cadence_avg', 'elevation_gain'
                ];
                
                fields.forEach(f => {
                    const mainVal = main.data[f];
                    const otherVal = other.data[f];
                    if ((mainVal === undefined || mainVal === 0 || mainVal === null) && (otherVal !== undefined && otherVal !== 0 && otherVal !== null)) {
                        updates[f] = otherVal;
                        main.data[f] = otherVal;
                    }
                });
                
                await other.ref.delete();
            }
            
            if (Object.keys(updates).length > 0) {
                await main.ref.update(updates);
                console.log(` ✅ Registro principal ${main.id} actualizado.`);
            }
        }
    }
    console.log('✅ Fusiones por ID completadas.');
}

activityIdMerge().catch(console.error);
