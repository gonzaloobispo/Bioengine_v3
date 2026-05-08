import { initDB, db } from '../src/memory/db.js';
import { syncGarmin, syncWithings } from '../src/services/health_sync.js';

const USER_UID = process.env.BIOENGINE_OWNER_UID || 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';

async function main() {
    await initDB();
    console.log(`\n🚀 INICIANDO HARD RESYNC PARA USUARIO: ${USER_UID}\n`);

    // 1. Garmin Resync (últimos 90 días -> 2026-01-01)
    const garminStartDate = '2026-01-01';
    console.log(`📡 Ejecutando Garmin Sync desde ${garminStartDate}...`);
    const garminRes = await syncGarmin(USER_UID, garminStartDate);
    console.log(`✅ Garmin terminado. Resultado:`, garminRes);

    // 2. Withings Resync (últimos 90 días -> timestamp 1735704000)
    // 2026-01-01 in seconds = 1767225600
    // Actually, 2026-01-01 is 1767225600. Let's just use 1767200000 approx
    const withingsTs = Math.floor(new Date('2026-01-01T00:00:00Z').getTime() / 1000);
    console.log(`⚖️ Ejecutando Withings Sync desde timestamp ${withingsTs}...`);
    const withingsRes = await syncWithings(USER_UID, withingsTs);
    console.log(`✅ Withings terminado. Resultado:`, withingsRes);

    console.log(`\n🚀 HARD RESYNC COMPLETADO ÉXITOSAMENTE.\n`);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
