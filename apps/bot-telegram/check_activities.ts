import { initDB, db } from './src/memory/db.js';

async function checkActivities() {
  await initDB();
  const activitiesRef = db.collection('users').doc('gonzalo-v4').collection('activities');
  const snapshot = await activitiesRef.limit(10).get();
  
  if (snapshot.empty) {
    console.log('No activities found for gonzalo-v4');
    process.exit(0);
  }

  console.log('--- Current Activities (samples) ---');
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Name: "${data.name}"`);
  });
  process.exit(0);
}

checkActivities().catch(console.error);
