import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import { resolve } from 'path';

function initFirebase() {
  if (getApps().length > 0) return;
  const saPath = resolve(process.cwd(), 'service-account.json');
  initializeApp({ credential: cert(JSON.parse(fs.readFileSync(saPath, 'utf8'))) });
}

async function main() {
  initFirebase();
  const db = getFirestore();
  const snap = await db.collection('users').doc('gonzalo-v4').collection('activities')
    .orderBy('start_time', 'desc').limit(5).get();

  console.log(`Total docs leídos: ${snap.docs.length}`);
  for (const doc of snap.docs) {
    const d = doc.data();
    console.log('\n--- Actividad:', doc.id);
    console.log('  name:', d.name);
    console.log('  start_time:', d.start_time?.toDate?.() || d.start_time);
    console.log('  duration_min:', d.duration_min, '| duration_seconds:', d.duration_seconds);
    console.log('  training_load:', d.training_load);
    console.log('  avg_hr:', d.avg_hr, '| avg_heart_rate:', d.avg_heart_rate);
    console.log('  distance_km:', d.distance_km);
    console.log('  TODOS LOS CAMPOS:', Object.keys(d).sort().join(', '));
  }
}
main().catch(console.error);
