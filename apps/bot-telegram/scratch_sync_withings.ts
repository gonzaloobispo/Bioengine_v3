import { initDB, db } from './src/memory/db.js';
import { syncWithings } from './src/services/health_sync.js';

async function run() {
    console.log("Initializing DB...");
    await initDB();
    
    if (!db) {
        console.error("Firestore DB initialization failed (db is still null).");
        process.exit(1);
    }
    
    const userId = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    console.log(`Starting Withings sync for ${userId}...`);
    
    // Pedir últimos 120 días (desde Diciembre 2025)
    const last120Days = Math.floor(Date.now() / 1000) - 120 * 86400;
    
    try {
        const result = await syncWithings(userId, last120Days);
        console.log('Sync result:', result);
    } catch (err) {
        console.error('Sync execution failed:', err);
    }
    
    process.exit(0);
}

run().catch(err => {
    console.error('Fatal error during run:', err);
    process.exit(1);
});
