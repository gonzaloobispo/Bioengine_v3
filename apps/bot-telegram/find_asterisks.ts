import { initDB, db } from './src/memory/db.js';

async function findAsterisks() {
  await initDB();
  const activitiesRef = db.collection('users').doc('gonzalo-v4').collection('activities');
  
  // Try to find ANY activity with a name that isn't null or "null"
  const snapshot = await activitiesRef.limit(50).get();
  
  console.log('--- Scanning Activities ---');
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.name && data.name.includes('*')) {
      console.log(`[ASTERISK FOUND] ID: ${doc.id} | Name: "${data.name}" | Type: ${data.type}`);
    } else {
       console.log(`ID: ${doc.id} | Name: "${data.name}" | Type: ${data.type}`);
    }
  });
  process.exit(0);
}

findAsterisks().catch(console.error);
