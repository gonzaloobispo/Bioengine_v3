import { initDB, db } from './src/memory/db.js';
import { validateConfig } from './src/config.js';

async function listAll() {
    validateConfig();
    await initDB();
    
    console.log("--- Listando Subcolecciones de /users/gonzalo-v4 ---");
    const userRef = db.collection('users').doc('gonzalo-v4');
    const collections = await userRef.listCollections();
    for (const col of collections) {
        console.log(`- Colección: ${col.id}`);
        // Listar 1 documento
        const snap = await col.limit(1).get();
        if (!snap.empty) {
            console.log(`  [DATO] Ejemplo: ${snap.docs[0].id}`);
        } else {
            console.log(`  [VACÍA]`);
        }
    }
}

listAll().catch(console.error);
