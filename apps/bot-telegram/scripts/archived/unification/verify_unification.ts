import { initDB, db } from './src/memory/db.js';

async function verify() {
  await initDB();
  console.log('--- AUDITORÍA OPERATIVA FIREBASE ---');
  
  // 1. Verificar Mapping
  const mappingRef = db.collection('telegram_mappings').doc('8067043732');
  const mappingSnap = await mappingRef.get();
  
  if (mappingSnap.exists) {
    console.log('CONFIRMADO: Mapping 8067043732 ->', mappingSnap.data()?.webUid);
  } else {
    console.log('FALLA: No existe mapping para 8067043732');
  }
  
  // 2. Verificar Usuario gonzalo-v4
  const userRef = db.collection('users').doc('gonzalo-v4');
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    console.log('CONFIRMADO: Usuario gonzalo-v4 existe en Firestore.');
  } else {
    console.log('SOSPECHA: Usuario gonzalo-v4 NO existe aún.');
  }

  process.exit(0);
}

verify().catch(console.error);
