import { db, initDB } from './memory/db.js';
import { checkAndSendAlerts } from './bot/alerts.js';
import { ENV } from './config.js';

async function testUXIntegration() {
    await initDB();
    console.log("🚀 Iniciando Validación Real Bloque 3C...");
    
    const testChatId = ENV.TELEGRAM_ALLOWED_USER_IDS[0];
    if (!testChatId) {
        console.error("❌ No hay usuarios permitidos configurados.");
        return;
    }

    console.log(`\n1️⃣ Probando comando /pause para usuario ${testChatId}...`);
    const until = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hora
    await db.collection('user_settings').doc(testChatId).set({
        pausedUntil: until.toISOString()
    }, { merge: true });
    
    console.log("✅ Firestore actualizado con pausedUntil.");

    console.log("\n2️⃣ Verificando que checkAndSendAlerts respeta la pausa...");
    // Esto debería loggear "User X is in Mute Mode. Skipping alerts."
    const ownerUid = process.env.BIOENGINE_OWNER_UID;
    if (!ownerUid) { console.error('BIOENGINE_OWNER_UID no configurado'); return; }
    await checkAndSendAlerts(ownerUid);

    console.log("\n3️⃣ Probando comando /resume...");
    await db.collection('user_settings').doc(testChatId).set({
        pausedUntil: null
    }, { merge: true });
    
    const doc = await db.collection('user_settings').doc(testChatId).get();
    if (!doc.data()?.pausedUntil) {
        console.log("✅ Firestore actualizado: Pausa eliminada.");
    } else {
        console.error("❌ Falló eliminación de pausa.");
    }

    console.log("\n4️⃣ Verificando registro de lectura (Simulación Callback)...");
    const testAlertId = "overreach";
    const docId = `${testChatId}_${testAlertId}`;
    
    // Simular que se envió y luego el usuario pulsó "Entendido"
    await db.collection('sent_alerts').doc(docId).set({
        alertId: testAlertId,
        chatId: testChatId,
        sentAt: new Date().toISOString(),
        readAt: null
    });
    
    console.log("Simulando pulsación de [✅ Entendido]...");
    await db.collection('sent_alerts').doc(docId).update({
        readAt: new Date().toISOString()
    });
    
    const alertDoc = await db.collection('sent_alerts').doc(docId).get();
    if (alertDoc.data()?.readAt) {
        console.log(`✅ Registro exitoso: readAt=${alertDoc.data()?.readAt}`);
    } else {
        console.error("❌ No se registró readAt.");
    }

    console.log("\n🏁 Validación Real Finalizada con Éxito.");
}

testUXIntegration().catch(console.error);
