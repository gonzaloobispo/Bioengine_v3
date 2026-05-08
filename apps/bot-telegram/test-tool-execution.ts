import { initDB } from './src/memory/db.js';
import { availableTools } from './src/tools/index.js';

async function testTool() {
    await initDB();
    const chatId = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    
    console.log('--- Probando bioengine_get_activities con Ciclismo ---');
    const result: any = await (availableTools as any).bioengine_get_activities({ type: 'Ciclismo', limit: 10 }, { chatId });
    
    if (result.success) {
        console.log(`✅ Éxito: Encontradas ${result.activities.length} actividades.`);
        result.activities.forEach((a: any) => console.log(` - [${a.type}] ${a.timestamp?.toDate ? a.timestamp.toDate() : a.timestamp}`));
    } else {
        console.error(`❌ Error en tool: ${result.message}`);
    }

    console.log('\n--- Probando bioengine_get_activities SIN filtro ---');
    const resultAll: any = await (availableTools as any).bioengine_get_activities({ limit: 10 }, { chatId });
    if (resultAll.success) {
        console.log(`✅ Éxito: Encontradas ${resultAll.activities.length} actividades totales.`);
    }
}

testTool().catch(console.error);
