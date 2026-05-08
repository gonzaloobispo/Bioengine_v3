import { db, initDB } from './src/memory/db.js';

async function check() {
    try {
        await initDB();
        const userId = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
        
        console.log(`Checking Garmin OAuth for user: ${userId}`);
        const secretSnap = await db.collection('users').doc(userId).collection('secrets').doc('garmin_oauth').get();
        
        if (!secretSnap.exists) {
            console.error('Garmin OAuth secret NOT FOUND in Firestore');
            process.exit(1);
        }

        const data = secretSnap.data();
        const updatedAt = data.updated_at?.toDate ? data.updated_at.toDate() : (data.updated_at ? new Date(data.updated_at) : null);
        
        console.log('Garmin OAuth status:');
        console.log(`- Updated At: ${updatedAt?.toISOString() || 'Unknown'}`);
        
        if (updatedAt) {
            const daysSinceUpdate = (new Date().getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
            console.log(`- Days since last update: ${daysSinceUpdate.toFixed(1)} days`);
            if (daysSinceUpdate > 85) {
                console.warn('CRITICAL: Token is older than 85 days. Needs refresh.');
            }
        }

        // Check last sync status from coachStatus or similar if exists
        const coachSnap = await db.collection('users').doc(userId).collection('status').doc('coach').get();
        if (coachSnap.exists) {
            const coachData = coachSnap.data();
            console.log(`- Coach Last Run: ${coachData.last_run?.toDate?.().toISOString() || coachData.last_run}`);
        }

        process.exit(0);
    } catch (err: any) {
        console.error('Error checking Garmin status:', err);
        process.exit(1);
    }
}

check();
