import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ENV } from './config.js';
import { resolve } from 'path';
import fs from 'fs';

async function main() {
    const credentialsPath = resolve(process.cwd(), ENV.SERVICE_ACCOUNT_FILE);
    if (!fs.existsSync(credentialsPath)) {
        console.error(`Firebase credentials not found at path: ${credentialsPath}`);
        process.exit(1);
    }
    
    initializeApp({
        credential: cert(credentialsPath)
    });
    
    const db = getFirestore();
    const USER_ID = 'gonzalo-v4';
    
    console.log(`Checking activities for user: ${USER_ID}`);
    const snapshot = await db.collection('users').doc(USER_ID).collection('activities').limit(1).get();
    
    if (snapshot.empty) {
        console.log('No activities found for this user.');
    } else {
        const doc = snapshot.docs[0];
        console.log('Activity ID:', doc.id);
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
    }
    
    process.exit(0);
}

main().catch(console.error);
