import { initDB, db } from '../src/memory/db.js';
import { syncActivityGear } from '../src/services/health_sync.js';
import { GarminConnect } from 'garmin-connect';

async function main() {
    await initDB();
    const snap = await db.collection('users').limit(1).get();
    if (snap.empty) return console.error('No user found');
    const userId = snap.docs[0].id;
    
    console.log(`Backfilling gear for user: ${userId}`);

    const garminClient = new GarminConnect();
    const secrets = await db.collection('users').doc(userId).collection('secrets').doc('garmin_oauth').get();
    if (!secrets.exists) return console.error('No Garmin token found');
    
    const token = JSON.parse(secrets.data()?.token || '{}');
    if (!token.access_token) return console.error('No access token');
    
    garminClient.client.interceptors.request.use(config => {
        config.headers['Authorization'] = 'Bearer ' + token.access_token;
        config.headers['di-backend'] = 'connectapi.garmin.com';
        return config;
    });

    const activities = await db.collection('users').doc(userId).collection('activities')
        .where('source', '==', 'garmin')
        .limit(10).get();

    console.log(`Found ${activities.size} recent activities`);

    for (const doc of activities.docs) {
        const act = doc.data();
        if (act.activity_id) {
            console.log(`Fetching gear for activity ${act.activity_id} (${act.name})...`);
            await syncActivityGear(userId, String(act.activity_id), garminClient.client);
        }
    }
    
    console.log('Finished backfilling gear');
}

main().catch(console.error);
