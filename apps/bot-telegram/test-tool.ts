import { initDB } from './src/memory/db.js';
import { availableTools } from './src/tools/index.js';

async function testAgentTool() {
    await initDB();
    const args = { type: 'Ciclismo', limit: 5 };
    const extra = { chatId: 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2' };

    console.log("--- Ejecutando tool bioengine_get_activities ---");
    // @ts-ignore
    const result = await availableTools.bioengine_get_activities(args, extra);

    console.log(JSON.stringify(result, null, 2));

    if (result.success && result.activities && result.activities.length > 0) {
        console.log(`✅ ¡Éxito! El Coach encontrará ${result.activities.length} actividades de Ciclismo.`);
        console.log(`   Última actividad: ${result.activities[0].distance_km}km en ${result.activities[0].duration_minutes}min.`);
    } else {
        console.log("❌ Sigue sin encontrar actividades.");
    }
}

testAgentTool().catch(console.error);
