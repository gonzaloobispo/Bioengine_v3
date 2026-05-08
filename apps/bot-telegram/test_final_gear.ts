
import { syncActivityGear, getGarminClient } from './src/services/health_sync.js';
import { db } from './src/services/database.js';

async function test() {
    const userId = 'o9JhwFid6HNA88w7VOnCEn8ZlA73';
    const actId = '22587135623';
    
    console.log('Getting Garmin client...');
    const client = await getGarminClient(userId);
    if (!client) {
        console.error('No client');
        return;
    }
    
    console.log('Testing activity gear sync...');
    await syncActivityGear(userId, actId, client);
    
    // Check Firestore
    console.log('Checking Firestore...');
    const doc = await db.collection('users').doc(userId).collection('activities').doc(`garmin_${actId}`).get();
    if (doc.exists) {
        console.log('Firestore gear:', doc.data()?.gear);
        console.log('Firestore gear_ids:', doc.data()?.gear_ids);
    } else {
        console.log('Document not found in Firestore:', `users/${userId}/activities/garmin_${actId}`);
    }
    process.exit(0);
}

test();
