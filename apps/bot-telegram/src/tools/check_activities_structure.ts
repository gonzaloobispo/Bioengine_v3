import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, '../../service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkActivities() {
  const userId = 'gonzalo-v4';
  const activitiesRef = db.collection('users').doc(userId).collection('activities');
  
  console.log(`Checking activities for user: ${userId}`);
  const snapshot = await activitiesRef.orderBy('timestamp', 'desc').limit(2).get();
  
  snapshot.forEach(doc => {
    console.log(`- ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

checkActivities().catch(console.error);
