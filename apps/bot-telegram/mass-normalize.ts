import { initDB, db } from './src/memory/db.js';
import * as admin from 'firebase-admin';

const TYPE_MAP: any = {
    'cycling': 'Ciclismo',
    'running': 'Running',
    'walking': 'Caminata',
    'strength_training': 'Fuerza',
    'Strength_Training': 'Fuerza',
    'Indoor_Cardio': 'Cardio',
    'Carrera': 'Running'
};

async function normalizeAll() {
    await initDB();
    const uid = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    const snap = await db.collection('users').doc(uid).collection('activities').get();
    
    console.log(`--- Normalizando ${snap.size} actividades para ${uid} ---`);
    let count = 0;
    const batch = db.batch();
    
    snap.docs.forEach(doc => {
        const d = doc.data();
        let changed = false;
        const updates: any = {};
        
        // 1. Normalizar Tipo
        const oldType = d.type || d.activity_type;
        if (oldType && TYPE_MAP[oldType]) {
            updates.type = TYPE_MAP[oldType];
            changed = true;
        }
        
        // 2. Normalizar Distancia (para el 0 km issue)
        if (!d.distance_km && d.distanceKm) {
             updates.distance_km = d.distanceKm;
             changed = true;
        } else if (!d.distance_km && d.total_distance) {
             updates.distance_km = d.total_distance / 1000;
             changed = true;
        }

        // 3. Normalizar Fecha (asegurar start_time y timestamp como Timestamps)
        const rawDate = d.start_time || d.timestamp || d.fecha;
        if (rawDate && (typeof rawDate === 'string' || typeof rawDate === 'number')) {
            const dt = new Date(rawDate);
            if (!isNaN(dt.getTime())) {
                const ts = admin.firestore.Timestamp.fromDate(dt);
                updates.start_time = ts;
                updates.timestamp = ts;
                changed = true;
            }
        }
        
        if (changed) {
            batch.update(doc.ref, updates);
            count++;
        }
    });
    
    if (count > 0) {
        await batch.commit();
        console.log(`✅ Normalizadas ${count} actividades.`);
    } else {
        console.log('No se requirieron cambios.');
    }
}

normalizeAll().catch(console.error);
