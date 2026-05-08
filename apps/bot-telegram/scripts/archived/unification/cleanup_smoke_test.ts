import { initDB, db } from './src/memory/db.js';
import { validateConfig } from './src/config.js';

async function cleanup() {
    validateConfig();
    await initDB();
    
    console.log("--- Verificando Acceso Firestore (RBAC) ---");
    try {
        const testRef = db.collection('users').doc('gonzalo-v4').collection('biometrics').doc('smoke-test-v4');
        const doc = await testRef.get();
        if (doc.exists) {
            console.log(`[EXISTE] Documento de prueba encontrado en: ${testRef.path}`);
            console.log("Eliminando documento...");
            await testRef.delete();
            console.log("[ELIMINADO] Documento de prueba eliminado correctamente.");
        } else {
            console.log("[NO EXISTE] El documento de prueba ya no está en Firestore.");
        }
    } catch (e: any) {
        console.error("[FALLA] Error de acceso a Firestore:", e.message);
    }
}

cleanup().catch(console.error);
