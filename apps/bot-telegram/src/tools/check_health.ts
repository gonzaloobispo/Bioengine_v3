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

async function checkHealth() {
  const userId = 'gonzalo-v4';
  const healthRef = db.collection('users').doc(userId).collection('daily_health');
  
  console.log(`Checking health for user: ${userId}`);
  const snap = await healthRef.limit(2).get();
  
  if (snap.empty) {
    console.log('No health data found.');
  } else {
    snap.forEach(doc => {
      console.log(`- ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
  }
}

checkHealth().catch(console.error);
