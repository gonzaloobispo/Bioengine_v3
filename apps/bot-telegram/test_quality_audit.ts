import { initDB } from './src/memory/db.js';
import { processTurn } from './src/agent/worker.js';

async function runAudit() {
    console.log("🧪 --- INICIANDO AUDITORÍA DE CALIDAD (Agente Tester) ---");
    await initDB();
    
    const chatId = "tester_audit_2026";
    const testCases = [
        { msg: "Hola, ¿quién eres?", type: "CHAT_BASIC" },
        { msg: "¿Cuál es mi peso actual?", type: "DATABASE_READ" },
        { msg: "Lista mis cuadernos de NotebookLM", type: "TOOL_NOTEBOOKLM" }
    ];

    for (const test of testCases) {
        if (testCases.indexOf(test) > 0) {
            console.log("⏳ Esperando 30s para evitar Rate Limit...");
            await new Promise(r => setTimeout(r, 30000));
        }
        const turnId = `audit_${test.type}_${Date.now()}`;
        console.log(`\n[${test.type}] 📝 Probando mensaje: "${test.msg}"`);
        
        try {
            // 1. Inyectar en Firestore
            const { db } = await import('./src/memory/db.js');
            await db.collection('chats').doc(chatId).collection('turns').doc(turnId).set({
                id: turnId,
                chatId: chatId,
                userMessage: test.msg,
                status: 'RECEIVED',
                timestamp: new Date().toISOString(),
                wasVoiceRequest: false
            });

            // 2. Procesar
            const startTime = Date.now();
            const result = await processTurn(chatId, turnId);
            const duration = (Date.now() - startTime) / 1000;

            if (result && result.text) {
                console.log(`✅ EXITO (${duration}s)`);
                console.log(`🤖 RESPUESTA: ${result.text.substring(0, 100)}...`);
            } else {
                console.log(`❌ FALLO: El bot devolvió una respuesta vacía.`);
            }
        } catch (e: any) {
            console.error(`💀 ERROR CRÍTICO en ${test.type}:`, e.message);
        }
    }

    console.log("\n🚀 --- AUDITORÍA FINALIZADA ---");
    process.exit(0);
}

runAudit();
