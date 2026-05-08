/**
 * Seed script: escribe el catálogo inicial de medicamentos y dolencias en Firestore.
 * Uso: npx ts-node --esm scripts/seed-catalog.ts
 *      (o compilar con tsc y ejecutar con node)
 *
 * Requiere que GOOGLE_APPLICATION_CREDENTIALS apunte al service-account.json,
 * o que se ejecute en un entorno con Application Default Credentials.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import { resolve } from 'path';

// Inicialización Firebase Admin
function initFirebase() {
  if (getApps().length > 0) return;
  const saPath = resolve(process.cwd(), 'service-account.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    initializeApp({ credential: cert(serviceAccount) });
    console.log('[seed] Firebase inicializado con service-account.json');
  } else {
    // ADC (Application Default Credentials)
    initializeApp();
    console.log('[seed] Firebase inicializado con ADC');
  }
}

const MEDICATIONS: string[] = [
  'Atenolol 50mg',
  'Ibuprofeno 400mg',
  'Paracetamol 500mg',
  'Omeprazol 20mg',
  'Vitamina D3',
  'Magnesio',
  'Omega-3',
];

const CONDITIONS: string[] = [
  'Dolor patelofemoral rodilla derecha',
  'Pronación severa pie izquierdo',
  'Pie plano bilateral',
  'Tendinitis aquílea',
  'Lumbalgia crónica',
  'Síndrome de banda iliotibial',
];

async function seedCatalog() {
  initFirebase();
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });

  const batch = db.batch();

  const medRef = db.collection('catalog').doc('medications');
  batch.set(medRef, {
    items: MEDICATIONS,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const condRef = db.collection('catalog').doc('conditions');
  batch.set(condRef, {
    items: CONDITIONS,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  console.log('[seed] Catálogo escrito en Firestore:');
  console.log(`  catalog/medications → ${MEDICATIONS.length} ítems`);
  console.log(`  catalog/conditions  → ${CONDITIONS.length} ítems`);
}

seedCatalog().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
