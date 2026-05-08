import { db, initDB } from './src/memory/db.js';

async function check() {
    try {
        await initDB();
        const userId = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
        const doc = await db.collection('users').doc(userId).get();
        if (!doc.exists) {
            console.log('User document not found');
        } else {
            const data = doc.data() || {};
            console.log('Coach Analysis Updated At:', data.coachAnalysisUpdatedAt?.toDate?.().toISOString() || data.coachAnalysisUpdatedAt);
            console.log('Coach Analysis (estado_forma):', data.coachAnalysis?.estado_forma);
            console.log('Last Garmin Sync (if exists in profile):', data.profile?.last_garmin_sync);
        }
        process.exit(0);
    } catch (err: any) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
