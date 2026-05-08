import { initDB, db } from './src/memory/db.js';

const TYPE_MAP: { [key: string]: string } = {
    'cycling': 'Ciclismo',
    'walking': 'Caminata',
    'running': 'Running',
    'Strength_Training': 'Fuerza',
    'strength_training': 'Fuerza',
    'Indoor_Cardio': 'Cardio Indoor',
    'breathwork': 'Respiración',
    'Carrera': 'Running'
};

async function migrateAndNormalize() {
    await initDB();
    const sourceUid = 'gonzalo-v4';
    const targetUid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    
    const sourceRef = db.collection('users').doc(sourceUid).collection('activities');
    const targetRef = db.collection('users').doc(targetUid).collection('activities');
    
    const snap = await sourceRef.get();
    console.log(`--- Migrando y Normalizando ${snap.size} actividades de ${sourceUid} a ${targetUid} ---`);
    
    let migrated = 0;
    for (const doc of snap.docs) {
        const d = doc.data();
        const normalized: any = { ...d };
        
        // 1. Normalizar Tipo
        const rawType = d.type || d.activity_type || d.activityType;
        if (TYPE_MAP[rawType]) {
            normalized.type = TYPE_MAP[rawType];
        }
        
        // 2. Normalizar Campos (distanceKm -> distance_km, etc.)
        if (d.distanceKm !== undefined && d.distance_km === undefined) normalized.distance_km = d.distanceKm / 1000;
        if (d.durationMinutes !== undefined && d.duration_minutes === undefined) normalized.duration_minutes = d.durationMinutes;
        if (d.calories_kcal !== undefined && d.calories === undefined) normalized.calories = d.calories_kcal;
        
        // 3. Asegurar activityId
        const id = d.activityId || d.garminId || doc.id;
        normalized.activityId = id.toString();

        // 4. Escribir en destino (con merge para no borrar datos si ya existe)
        await targetRef.doc(normalized.activityId).set(normalized, { merge: true });
        migrated++;
        if (migrated % 50 === 0) console.log(`${migrated} procesadas...`);
    }
    
    console.log(`✅ Migración completada. ${migrated} actividades normalizadas en ${targetUid}.`);
}

migrateAndNormalize().catch(console.error);
