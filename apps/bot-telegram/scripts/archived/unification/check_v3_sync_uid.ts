import { initDB, db } from './src/memory/db.js';

async function checkOtherUser() {
  await initDB();
  const UID = "HTJlt5RxMjeJwZX9CHlPTeDzNfi1";
  const activitiesRef = db.collection('users').doc(UID).collection('activities');
  const snapshot = await activitiesRef.limit(10).get();
  
  if (snapshot.empty) {
    console.log(`No activities found for ${UID}`);
    process.exit(0);
  }

  console.log(`--- Activities for ${UID} ---`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Name: "${data.name}" | Type: ${data.type}`);
  });
  process.exit(0);
}

checkOtherUser().catch(console.error);
