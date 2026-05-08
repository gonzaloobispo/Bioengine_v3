import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'bioengine-v4' });
const db = getFirestore();

async function main() {
  const snap = await db.collection('processed_updates').get();
  console.log('Total docs in processed_updates:', snap.size);

  for (const doc of snap.docs) {
    console.log('Deleting:', doc.id);
    await doc.ref.delete();
  }
  console.log('DONE: All processed_updates cleared');
}

main().catch(console.error);
