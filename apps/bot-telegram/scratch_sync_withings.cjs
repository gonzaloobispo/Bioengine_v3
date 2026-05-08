const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');
const { syncWithings } = require('./dist/services/health_sync.js');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function run() {
    const userId = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    console.log(`Starting Withings sync for ${userId}...`);
    // Pedir últimos 90 días para asegurar que todo esté recuperado
    const last30Days = Math.floor(Date.now() / 1000) - 90 * 86400;
    const result = await syncWithings(userId, last30Days);
    console.log('Sync result:', result);
    process.exit(0);
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
