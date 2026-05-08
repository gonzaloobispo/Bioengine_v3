/**
 * Seed script: inicializa el perfil del owner (gonzalo-v4) en Firestore.
 * Uso: npx ts-node --esm scripts/seed-owner-profile.ts
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import { resolve } from 'path';

function initFirebase() {
  if (getApps().length > 0) return;
  const saPath = resolve(process.cwd(), 'service-account.json');
  if (fs.existsSync(saPath)) {
    initializeApp({ credential: cert(JSON.parse(fs.readFileSync(saPath, 'utf8'))) });
  } else {
    initializeApp();
  }
}

const OWNER_UID = process.env.BIOENGINE_OWNER_UID || 'gonzalo-v4';

const ownerProfile = {
  nombre: 'Gonzalo',
  fechaNacimiento: '1976-04-29',
  sexo: 'Masculino',
  estatura: 178,
  peso: 77,
  medicaciones: ['Atenolol 50mg'],
  lesiones: [
    'Dolor patelofemoral rodilla derecha',
    'Pronación severa pie izquierdo',
    'Pie plano bilateral',
  ],
  deportes: ['ciclismo', 'running', 'tenis', 'natación'],
  preferencias: {
    diasDisponibles: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
    diasCiclismo: ['sábado', 'domingo'],
    objetivo: 'rendimiento',
  },
  onboardingCompleted: true,
  status: 'active',
  role: 'admin',
  updatedAt: FieldValue.serverTimestamp(),
};

async function seedOwnerProfile() {
  initFirebase();
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });

  const ref = db.collection('users').doc(OWNER_UID);
  const existing = await ref.get();

  if (existing.exists) {
    // Merge: solo actualiza campos vacíos o faltantes + garantiza status active
    await ref.set(ownerProfile, { merge: true });
    console.log(`[seed] Perfil de ${OWNER_UID} actualizado (merge).`);
  } else {
    await ref.set({ ...ownerProfile, createdAt: FieldValue.serverTimestamp() });
    console.log(`[seed] Perfil de ${OWNER_UID} creado.`);
  }

  const snap = await ref.get();
  const data = snap.data()!;
  console.log(`  nombre: ${data.nombre}`);
  console.log(`  status: ${data.status}`);
  console.log(`  onboardingCompleted: ${data.onboardingCompleted}`);
  console.log(`  medicaciones: ${data.medicaciones?.join(', ')}`);
}

seedOwnerProfile().catch(err => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
