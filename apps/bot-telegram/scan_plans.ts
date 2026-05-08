import { initDB, db } from './src/memory/db.js';

async function scanPlans() {
  await initDB();
  const plansRef = db.collection('users').doc('gonzalo-v4').collection('plans');
  const snapshot = await plansRef.get();
  
  console.log(`Plans found: ${snapshot.size}`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Name: "${data.name}"`);
    if (data.exercises) {
        console.log(`Exercises: ${JSON.stringify(data.exercises).substring(0, 100)}...`);
    }
  });
  process.exit(0);
}

scanPlans().catch(console.error);
