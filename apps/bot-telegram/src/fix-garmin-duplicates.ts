/**
 * fix-garmin-duplicates.ts
 *
 * Limpia duplicados generados por fallos de conexión con Garmin.
 * Criterio: mismo tipo de actividad + misma hora de inicio (+/-5 min).
 * Acción: conserva el registro con más datos, elimina el incompleto (duracion=0).
 *
 * Uso:
 *   npx ts-node --esm fix-garmin-duplicates.ts --dry-run   (solo muestra, no elimina)
 *   npx ts-node --esm fix-garmin-duplicates.ts              (elimina)
 */

import { initDB, db } from './memory/db.js';

const USER_UID = 'gonzalo-v4';
const DRY_RUN = process.argv.includes('--dry-run');

const getTimestampMs = (val: any): number => {
    if (!val) return 0;
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (typeof val.toDate === 'function') return val.toDate().getTime();
    if (typeof val === 'number') return val;
    return new Date(val).getTime();
};

async function fixGarminDuplicates() {
    await initDB();

    console.log(`\n🔍 BioEngine — Limpieza de duplicados Garmin`);
    console.log(`   Usuario: ${USER_UID}`);
    console.log(`   Modo: ${DRY_RUN ? '⚠️  DRY RUN (sin cambios reales)' : '🔴 EJECUCIÓN REAL'}\n`);

    // Ordenar por start_time ASC para comparar pares consecutivos
    const snap = await db
        .collection('users')
        .doc(USER_UID)
        .collection('activities')
        .orderBy('start_time', 'asc')
        .get();

    console.log(`📊 Total actividades encontradas: ${snap.size}\n`);

    const docs = snap.docs;
    const toDelete: { id: string; reason: string }[] = [];
    let pairs = 0;

    for (let i = 0; i < docs.length - 1; i++) {
        const d1 = docs[i].data();
        const d2 = docs[i + 1].data();

        const t1 = getTimestampMs(d1.start_time);
        const t2 = getTimestampMs(d2.start_time);

        const type1 = d1.type || d1.activity_type || '';
        const type2 = d2.type || d2.activity_type || '';
        const sameType = type1 === type2 && type1 !== '';
        const timeDiff = Math.abs(t1 - t2);
        const sameTime = timeDiff < 5 * 60 * 1000; // 5 minutos tolerancia

        if (sameType && sameTime) {
            pairs++;
            const dur1 = Number(d1.duration_minutes || d1.durationMinutes || 0);
            const dur2 = Number(d2.duration_minutes || d2.durationMinutes || 0);
            const dist1 = Number(d1.distance_km || d1.distanceKm || 0);
            const dist2 = Number(d2.distance_km || d2.distanceKm || 0);

            // Score de completitud: cuántos campos tienen datos válidos
            const score = (d: any): number => {
                let s = 0;
                if (Number(d.duration_minutes || d.durationMinutes || 0) > 0) s += 5;
                if (Number(d.distance_km || d.distanceKm || 0) > 0) s += 3;
                if (Number(d.avg_heart_rate || d.avgHeartRate || 0) > 0) s += 1;
                if (Number(d.elevation_gain || d.elevationGain || 0) > 0) s += 1;
                if (Number(d.calories || d.kilocalories || 0) > 0) s += 1;
                return s;
            };

            const score1 = score(d1);
            const score2 = score(d2);

            console.log(`🔄 Duplicado #${pairs}:`);
            console.log(`   Tipo: ${type1}`);
            console.log(`   Hora A: ${new Date(t1).toLocaleString('es-AR')} | Hora B: ${new Date(t2).toLocaleString('es-AR')} (diff=${Math.round(timeDiff/1000)}s)`);
            console.log(`   Doc A [${docs[i].id}]: dur=${dur1.toFixed(0)}min dist=${dist1.toFixed(1)}km score=${score1}`);
            console.log(`   Doc B [${docs[i + 1].id}]: dur=${dur2.toFixed(0)}min dist=${dist2.toFixed(1)}km score=${score2}`);

            // Mantener el de mayor score; si empatan mantener A (primero en tiempo)
            const deleteIdx = score1 >= score2 ? i + 1 : i;
            const keepIdx = score1 >= score2 ? i : i + 1;

            const deletedData = docs[deleteIdx].data();
            const deletedDur = Number(deletedData.duration_minutes || deletedData.durationMinutes || 0);
            const reason = `dur=${deletedDur.toFixed(0)}min score=${deleteIdx === i ? score1 : score2} → mantenido: ${docs[keepIdx].id}`;
            toDelete.push({ id: docs[deleteIdx].id, reason });
            console.log(`   ✅ Mantener: ${docs[keepIdx].id} | 🗑️  Eliminar: ${docs[deleteIdx].id}`);
            console.log(`   Razón: ${reason}\n`);

            i++; // saltar siguiente ya procesado
        }
    }

    console.log(`\n📋 Resumen:`);
    console.log(`   Pares duplicados encontrados: ${pairs}`);
    console.log(`   Documentos a eliminar: ${toDelete.length}`);

    if (toDelete.length === 0) {
        console.log('\n✨ No se encontraron duplicados. Base de datos limpia.');
        process.exit(0);
    }

    if (DRY_RUN) {
        console.log('\n⚠️  DRY RUN — Los siguientes documentos SERÍAN eliminados:');
        toDelete.forEach(({ id, reason }) => console.log(`   🗑️  ${id} — ${reason}`));
        console.log('\nEjecuta sin --dry-run para aplicar los cambios reales.');
        process.exit(0);
    }

    // Eliminar en batches de 500 (límite Firestore)
    const BATCH_SIZE = 500;
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = toDelete.slice(i, i + BATCH_SIZE);
        chunk.forEach(({ id }) => {
            const ref = db.collection('users').doc(USER_UID).collection('activities').doc(id);
            batch.delete(ref);
        });
        await batch.commit();
        console.log(`\n✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} documentos eliminados.`);
    }

    console.log(`\n🎉 Limpieza completada. ${toDelete.length} duplicados eliminados de Firestore.`);
    process.exit(0);
}

fixGarminDuplicates().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
