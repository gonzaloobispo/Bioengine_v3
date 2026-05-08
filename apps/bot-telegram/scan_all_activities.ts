import { initDB, db } from './src/memory/db.js';

async function scanAllActivities() {
  await initDB();
  const activitiesRef = db.collection('users').doc('gonzalo-v4').collection('activities');
  const snapshot = await activitiesRef.get();
  
  console.log(`Total activities found: ${snapshot.size}`);
  let countWithAsterisks = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const name = data.name || '';
    const type = data.type || '';
    
    if (name.includes('*') || type.includes('*')) {
      countWithAsterisks++;
      if (countWithAsterisks <= 20) {
        console.log(`[MATCH] ID: ${doc.id} | Name: "${name}" | Type: "${type}"`);
      }
    }
  });
  
  console.log(`\nFound ${countWithAsterisks} activities with asterisks.`);
  process.exit(0);
}

scanAllActivities().catch(console.error);
