import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { ENV } from '../config.js';
import * as fs from 'fs';
import { resolve } from 'path';

// Will hold the Firestore instance
import { getStorage } from 'firebase-admin/storage';
// Will hold the Firestore instance
export let db: any = null;
export let storage: any = null;

// CRITICAL: Initialize Firebase Admin synchronously at module load time.
// firebase-functions v2 calls getFirestore() in an onInit callback during module
// initialization (before any function handler runs). If initializeApp() is only
// called inside an async function like initDB(), processTurnEvent (Eventarc trigger)
// will fail with "The default Firebase app does not exist".
(function earlyInitFirebase() {
  if (getApps().length > 0) return;
  const isGCP = !!(process.env.K_SERVICE || process.env.FUNCTION_TARGET || process.env.GCLOUD_PROJECT);
  const isEmulator = !!process.env.FUNCTIONS_EMULATOR;
  if (isGCP || isEmulator) {
    // Clear invalid GOOGLE_APPLICATION_CREDENTIALS (set from .env, doesn't exist in GCP containers)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
    initializeApp({ storageBucket: `${process.env.GCLOUD_PROJECT || 'bioengine-v4'}.firebasestorage.app` });
    console.log('[db] Firebase initialized (GCP/ADC) at module load.');
  }
  // Local dev: initDB() will handle service-account.json initialization
})();

export async function initDB(): Promise<void> {

  const isEmulator = !!process.env.FUNCTIONS_EMULATOR;
  // GCLOUD_PROJECT is present in ALL GCP environments: HTTP functions (K_SERVICE),
  // background/Eventarc functions (FUNCTION_TARGET), and Cloud Run jobs.
  const isCloudRun = !!(process.env.K_SERVICE || process.env.FUNCTION_TARGET || process.env.GCLOUD_PROJECT);

  if (getApps().length === 0) {
    if (isEmulator || isCloudRun) {
      // In production GCP — use Application Default Credentials.
      // CRITICAL: Clear GOOGLE_APPLICATION_CREDENTIALS if it points to a non-existent file
      // (inherited from .env deployed to Cloud Functions). google-auth-library fails with
      // ENOENT before falling back to ADC if this env var is set but invalid.
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        console.log(`Clearing invalid GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      initializeApp({
        storageBucket: `${process.env.GCLOUD_PROJECT || 'bioengine-v4'}.firebasestorage.app`
      });
    } else {
      // Local development — use service account if available, otherwise fall back to ADC.
      const saPath = resolve(process.cwd(), ENV.SERVICE_ACCOUNT_FILE);
      if (fs.existsSync(saPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
        initializeApp({
          credential: cert(serviceAccount),
          storageBucket: 'bioengine-v4.firebasestorage.app'
        });
      } else {
        // Fallback: ADC local (gcloud auth application-default login)
        initializeApp();
      }
    }
  }

  db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });
  storage = getStorage();
  console.log('Firebase Firestore & Storage initialized successfully.');
}

export async function saveMessage(role: string, content: string | null, chatId: string = 'default', meta: any = {}): Promise<void> {
  const messagesRef = db.collection('messages');
  await messagesRef.add({
    role,
    content,
    chatId,
    ...meta,
    timestamp: FieldValue.serverTimestamp(),
    order: Date.now()
  });
}

export async function getMessages(limit: number = 50, chatId: string = 'default'): Promise<any[]> {
  const messagesRef = db.collection('messages');

  // Filtrar por chatId en Firestore (no en memoria) para evitar que mensajes de otros chats
  // desplacen los del chatId objetivo cuando hay muchos mensajes en la colección global.
  // Requiere índice compuesto en Firestore: chatId ASC + order DESC.
  // Si el índice no existe, hace fallback a la query sin filtro.
  let snapshot: any;
  try {
    snapshot = await messagesRef
      .where('chatId', '==', chatId)
      .orderBy('order', 'desc')
      .limit(limit)
      .get();
  } catch (indexErr: any) {
    console.warn(`[getMessages] Índice compuesto (chatId+order) no disponible, fallback: ${indexErr.message}`);
    // Fallback: fetch más docs y filtrar en memoria
    snapshot = await messagesRef.orderBy('order', 'desc').limit(limit * 10).get();
  }

  const rows: any[] = [];
  snapshot.forEach((doc: any) => {
    const data = doc.data();
    // En el fallback, filtramos por chatId en memoria; en la query directa ya viene filtrado
    if (data.chatId !== chatId) return;
    if (rows.length >= limit) return;

    const content = data.content || "";
    if (data.role === 'assistant' && content.startsWith('[Calling tool:')) {
      return;
    }

    const msg: any = {
      role: data.role,
      content: content
    };
    if (data.tool_calls) msg.tool_calls = data.tool_calls;
    if (data.tool_call_id) msg.tool_call_id = data.tool_call_id;
    if (data.name) msg.name = data.name;
    rows.push(msg);
  });

  const ordered = rows.reverse();

  // Strip leading tool messages that have no preceding assistant(tool_calls).
  // This happens when the history window cuts off mid tool-call pair.
  let startIdx = 0;
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].role === 'tool') {
      startIdx = i + 1; // skip this orphaned tool message
    } else {
      break;
    }
  }

  return startIdx > 0 ? ordered.slice(startIdx) : ordered;
}

export async function isUpdateProcessed(updateId: number): Promise<boolean> {
  const doc = await db.collection('processed_updates').doc(updateId.toString()).get();
  return doc.exists;
}

export async function markUpdateProcessed(updateId: number): Promise<boolean> {
  try {
    // Attempt to create. This will THROW if the document already exists.
    await db.collection('processed_updates').doc(updateId.toString()).create({
      processedAt: FieldValue.serverTimestamp(),
      status: 'processing'
    });
    return true;
  } catch (e: any) {
    // ALREADY_EXISTS is expected if another process started it
    return false;
  }
}

export async function saveMemory(key: string, value: string): Promise<void> {
  const memoryRef = db.collection('memory_key_value').doc(key);
  await memoryRef.set({
    value,
    timestamp: FieldValue.serverTimestamp()
  });
}

export async function getMemory(key: string): Promise<string | null> {
  const memoryRef = db.collection('memory_key_value').doc(key);
  const doc = await memoryRef.get();

  if (doc.exists) {
    return doc.data()?.value as string;
  }
  return null;
}

export async function clearMemory(): Promise<void> {
  // Batch delete not trivial cleanly in Firestore without fetching first, 
  // but a simple loop deletion handles typical scale. 
  const messagesRef = db.collection('messages');
  const messagesSnap = await messagesRef.get();

  const batch1 = db.batch();
  messagesSnap.docs.forEach((doc: any) => batch1.delete(doc.ref));
  await batch1.commit();

  const memoryRef = db.collection('memory_key_value');
  const memorySnap = await memoryRef.get();

  const batch2 = db.batch();
  memorySnap.docs.forEach((doc: any) => batch2.delete(doc.ref));
  await batch2.commit();
}

/** DELEGATION METHODS **/

export async function createDelegatedTask(task_name: string, objective: string, context: string, chatId: string): Promise<string> {
  const taskRef = db.collection('delegated_tasks').doc();
  await taskRef.set({
    task_name,
    objective,
    context,
    chatId,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp()
  });
  return taskRef.id;
}

export async function updateDelegatedTaskStatus(taskId: string, status: string, result: string | null = null): Promise<void> {
  const taskRef = db.collection('delegated_tasks').doc(taskId);
  const updateData: any = {
    status,
    updatedAt: FieldValue.serverTimestamp()
  };
  if (result !== null) {
    updateData.result = result;
  }
  await taskRef.update(updateData);
}

export async function getDelegatedTask(taskId: string): Promise<any> {
  const taskRef = db.collection('delegated_tasks').doc(taskId);
  const doc = await taskRef.get();
  return doc.exists ? doc.data() : null;
}

export async function getPendingDelegatedTasks(chatId: string): Promise<any[]> {
  const tasksRef = db.collection('delegated_tasks');
  const snapshot = await tasksRef
    .where('chatId', '==', chatId)
    .where('status', 'in', ['pending', 'working'])
    .get();
  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

// ─────────────────────────────────────────
// ACTIVITY CLASSIFICATION (ítem #14)
// ─────────────────────────────────────────

/**
 * Clasifica una actividad según la regla:
 * - name (o nombre) no nulo y no vacío → tipo = "carrera"
 * - name (o nombre) nulo o vacío       → tipo = "entrenamiento"
 * No modifica Firestore; enriquece el objeto en runtime.
 */
export function classifyActivity(activity: any): any {
  const nameField = activity.name || activity.nombre;
  // Clasificación básica legado
  const tipo: string = (nameField && String(nameField).trim() !== '') ? 'carrera' : 'entrenamiento';
  
  // Normalización de métricas comunes para el LLM
  const normalized: any = { ...activity, tipo };

  // Cálculo de ritmo (pace) dinámico si faltan campos pero tenemos distancia y tiempo
  const dist = Number(activity.distance_km || activity.distanceKm || 0);
  const dur = Number(activity.duration_min || activity.duration_minutes || activity.durationMinutes || 0);
  
  let calculatedPace = activity.avg_pace || activity.pace;
  if (!calculatedPace && dist > 0 && dur > 0) {
    const totalSeconds = (dur * 60) / dist;
    const min = Math.floor(totalSeconds / 60);
    const sec = Math.round(totalSeconds % 60);
    if (min < 60) {
      calculatedPace = `${min}:${sec.toString().padStart(2, '0')}`;
    }
  }
  
  // Exponer ritmo y velocidad de forma amigable para el Coach
  if (calculatedPace) {
    normalized.ritmo_humanizado = `${calculatedPace} min/km`;
    if (activity.avg_speed_kmh) {
      normalized.ritmo_humanizado += ` (${activity.avg_speed_kmh} km/h)`;
    }
  } else if (activity.avg_speed_kmh) {
    normalized.ritmo_humanizado = `${activity.avg_speed_kmh} km/h`;
  }

  return normalized;
}

/** BIOENGINE INTEGRATION **/

export async function linkTelegramId(telegramId: string, webUid: string): Promise<void> {
  const userRef = db.collection('users').doc(webUid);
  await userRef.set({
    telegramId: telegramId.toString(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  // Also create a reverse mapping for fast lookup
  const mappingRef = db.collection('telegram_mappings').doc(telegramId.toString());
  await mappingRef.set({
    webUid,
    updatedAt: FieldValue.serverTimestamp()
  });
}

export async function getUserByTelegramId(telegramId: string): Promise<any> {
  const mappingRef = db.collection('telegram_mappings').doc(telegramId.toString());
  const mappingSnap = await mappingRef.get();

  if (!mappingSnap.exists) {
    // Si no hay mapping, el chatId puede ser directamente el userId (chats del dashboard)
    const userRef = db.collection('users').doc(telegramId.toString());
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      return { id: userSnap.id, ...userSnap.data() };
    }
    // Fallback: devolver un objeto mínimo con el id para no bloquear operaciones
    console.warn(`No mapping found for chatId: ${telegramId}. Treating as direct userId.`);
    return { id: telegramId.toString() };
  }

  const webUid = mappingSnap.data().webUid;
  const userRef = db.collection('users').doc(webUid);
  const userSnap = await userRef.get();

  return userSnap.exists ? { id: userSnap.id, ...userSnap.data() } : { id: webUid };
}

export async function saveBioMetric(telegramId: string, type: string, value: number, unit: string): Promise<void> {
  const user = await getUserByTelegramId(telegramId);
  if (!user) throw new Error('User not linked to BioEngine');

  const metricRef = db.collection('users').doc(user.id).collection('metrics').doc();
  await metricRef.set({
    type,
    value,
    unit,
    timestamp: FieldValue.serverTimestamp()
  });
}

export async function getRecentBioMetrics(telegramId: string, type?: string, limit: number = 5): Promise<any[]> {
  const user = await getUserByTelegramId(telegramId);
  if (!user) throw new Error('User not linked to BioEngine');

  const normalizedType = (type || '').toLowerCase();
  
  // V4.9: Support dual document formats in biometrics collection:
  // - Numbered docs: { weightKg, timestamp (Firestore Timestamp) }
  // - Withings docs: { weight_kg, date (ISO string "YYYY-MM-DD"), no timestamp field }
  if (normalizedType === 'weight' || normalizedType === 'peso' || !type) {
    // V4.11: Fetch a large block to ensure we find recent data across mixed formats (Numbered/Withings)
    // We sort in memory below to handle missing 'updated_at' or 'timestamp' fields in older docs.
    const bioSnap = await db.collection('users').doc(user.id).collection('biometrics').limit(2000).get();

    if (!bioSnap.empty) {
      const results = bioSnap.docs
        .map((doc: any) => {
          const d = doc.data();
          const weightValue = d.weightKg || d.weight_kg || d.value;
          if (!weightValue) return null;
          // Normalize timestamp: Firestore Timestamp, or ISO string date field
          const rawTs = d.timestamp?.toDate ? d.timestamp.toDate() : (d.date ? new Date(d.date) : null);
          if (!rawTs) return null;
          const entry: any = {
            id: doc.id,
            type: 'biometrics',
            weight_kg: weightValue,
            unit: 'kg',
            timestamp: rawTs,
            date: rawTs.toISOString().split('T')[0]
          };
          if (d.bmi) entry.bmi = d.bmi;
          if (d.fat_percent) entry.fat_percent = d.fat_percent;
          if (d.muscle_percent) entry.muscle_percent = d.muscle_percent;
          if (d.muscleMassKg) entry.muscle_mass_kg = d.muscleMassKg;
          if (d.fatPct) entry.fat_percent = d.fatPct;
          return entry;
        })
        .filter(Boolean);

      return results
        .sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    }
  }

  let query = db.collection('users').doc(user.id).collection('metrics').orderBy('timestamp', 'desc');
  if (type) {
    query = query.where('type', '==', type);
  }
  const snapshot = await query.limit(limit).get();
  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

export async function getRecentActivities(telegramId: string, type?: string, limit: number = 20): Promise<any[]> {
  const user = await getUserByTelegramId(telegramId);
  if (!user) throw new Error('User not linked to BioEngine');

  // V4.12: Usar 'start_time' para el orden cronológico real. 
  // 'timestamp' puede contener fechas de importación/migración incorrectas (legacy bug).
  const snapshot = await db.collection('users').doc(user.id).collection('activities')
    .orderBy('start_time', 'desc').limit(Math.max(limit, 100)).get();
  
  let activities = snapshot.docs.map((doc: any) => classifyActivity({ id: doc.id, ...doc.data() }));
  
  if (type) {
    const searchType = type.toLowerCase();
    activities = activities.filter((a: any) => 
      (a.type && a.type.toLowerCase() === searchType) || 
      (a.name && a.name.toLowerCase().includes(searchType))
    );
  }

  return activities.slice(0, limit);
}

/** DAILY HEALTH & PAIN LOGS **/

export async function saveDailyHealth(telegramId: string, data: any): Promise<void> {
  const user = await getUserByTelegramId(telegramId);
  if (!user) throw new Error('User not linked to BioEngine');

  const dateStr = data.fecha || new Date().toISOString().split('T')[0];
  const healthRef = db.collection('users').doc(user.id).collection('daily_health').doc(dateStr);

  await healthRef.set({
    ...data,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
}

export async function getRecentDailyHealth(telegramId: string, limit: number = 7): Promise<any[]> {
  const user = await getUserByTelegramId(telegramId);
  if (!user) throw new Error('User not linked to BioEngine');

  const snapshot = await db.collection('users').doc(user.id).collection('daily_health')
    .orderBy('updatedAt', 'desc').limit(limit).get();
  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

export async function savePainRecord(telegramId: string, level: number, location: string, side: string, notes?: string): Promise<string> {
  const user = await getUserByTelegramId(telegramId);
  if (!user) throw new Error('User not linked to BioEngine');

  const painRef = db.collection('users').doc(user.id).collection('pain_logs').doc();
  await painRef.set({
    level,
    location,
    side,
    notes: notes || '',
    date: new Date().toISOString(),
    timestamp: FieldValue.serverTimestamp()
  });

  // Also save as a generic metric for unified graphing
  await saveBioMetric(telegramId, `pain_${location.toLowerCase().replace(/ /g, '_')}_${side}`, level, '0-10');
  return painRef.id;
}

export async function getRecentPainLogs(telegramId: string, limit: number = 5): Promise<any[]> {
  const user = await getUserByTelegramId(telegramId);
  if (!user) throw new Error('User not linked to BioEngine');

  const snapshot = await db.collection('users').doc(user.id).collection('pain_logs')
    .orderBy('timestamp', 'desc').limit(limit).get();
  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

// ─────────────────────────────────────────
// EQUIPMENT / GEAR TRACKING (ítem #15)
// ─────────────────────────────────────────

const VALID_EQUIPMENT_TYPES = ['zapatillas_running', 'zapatillas_tenis', 'bicicleta', 'raqueta', 'otro'] as const;
export type EquipmentType = typeof VALID_EQUIPMENT_TYPES[number];

export interface EquipmentItem {
  id: string;
  nombre: string;
  tipo: EquipmentType;
  km_totales: number;
  fecha_inicio: string;
  activo: boolean;
  notas: string;
  vida_util_km?: number;
  createdAt?: any;
}

export async function getEquipment(userId: string): Promise<EquipmentItem[]> {
  const snap = await db.collection(`users/${userId}/equipment`)
    .where('activo', '==', true)
    .get()
    .catch(async () => db.collection(`users/${userId}/equipment`).get());
  return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as EquipmentItem));
}

export async function saveEquipment(userId: string, data: Omit<EquipmentItem, 'id' | 'createdAt'>): Promise<string> {
  const ref = db.collection(`users/${userId}/equipment`).doc();
  const docData: any = {
    ...data,
    km_totales: data.km_totales || 0,
    activo: data.activo !== false,
    notas: data.notas || '',
    createdAt: FieldValue.serverTimestamp()
  };
  if (data.vida_util_km !== undefined) {
    docData.vida_util_km = data.vida_util_km;
  }
  await ref.set(docData);
  return ref.id;
}

/**
 * Calcula los km acumulados por un equipo desde su fecha de inicio
 * sumando distancias de actividades Garmin filtradas por deporte.
 */
export async function calcEquipmentKm(userId: string, equipmentTipo: string, fechaInicio: string): Promise<number> {
  try {
    const startDate = new Date(fechaInicio);
    const snap = await db.collection(`users/${userId}/activities`)
      .orderBy('start_time', 'asc')
      .startAt(startDate)
      .get()
      .catch(async () => {
        // Fallback sin índice de fecha: traer todas y filtrar en memoria
        return db.collection(`users/${userId}/activities`).limit(2000).get();
      });

    let total = 0;
    for (const doc of snap.docs) {
      const act = doc.data();

      // Filtrar por fecha si el índice no filtró
      const actDate = act.start_time?.toDate ? act.start_time.toDate() : (act.start_time ? new Date(act.start_time) : null);
      if (actDate && actDate < startDate) continue;

      const sport = (act.sport || act.type || '').toLowerCase();
      let matches = false;

      switch (equipmentTipo) {
        case 'zapatillas_running':
          matches = sport.includes('run') || sport.includes('running');
          break;
        case 'zapatillas_tenis':
        case 'raqueta':
          matches = sport.includes('tennis') || sport.includes('tenis');
          break;
        case 'bicicleta':
          matches = sport.includes('cycling') || sport.includes('ciclismo') || sport.includes('bike');
          break;
        case 'otro':
          matches = true;
          break;
        default:
          matches = false;
      }

      if (matches) {
        const distKm = Number(act.distance_km || act.distancia_km || act.distanceKm || 0);
        total += distKm;
      }
    }

    return Math.round(total * 10) / 10;
  } catch (e: any) {
    console.warn(`[calcEquipmentKm] Error calculando km para ${userId}/${equipmentTipo}:`, e.message);
    return 0;
  }
}

export async function updateEquipmentKm(userId: string, equipmentId: string, kmToAdd: number): Promise<void> {
  const ref = db.collection(`users/${userId}/equipment`).doc(equipmentId);
  await ref.update({
    km_totales: FieldValue.increment(kmToAdd),
    updatedAt: FieldValue.serverTimestamp()
  });
}

export async function deactivateEquipment(userId: string, equipmentId: string): Promise<void> {
  const ref = db.collection(`users/${userId}/equipment`).doc(equipmentId);
  await ref.update({
    activo: false,
    updatedAt: FieldValue.serverTimestamp()
  });
}

/**
 * Mapea el gearTypeName de Garmin a nuestros tipos internos de equipamiento.
 */
function mapGarminGearType(gearTypeName: string): EquipmentType {
  const t = (gearTypeName || '').toUpperCase();
  if (t.includes('RUNNING') || t.includes('SHOES')) return 'zapatillas_running';
  if (t.includes('CYCLING') || t.includes('BIKE')) return 'bicicleta';
  if (t.includes('TENNIS')) return 'zapatillas_tenis';
  return 'otro';
}

/**
 * Upsert de un item de gear de Garmin en users/{userId}/equipment.
 * Busca por campo garmin_gear_id. Si existe actualiza, si no crea.
 */
export async function upsertGarminGear(userId: string, gearItem: {
  gearId: string;
  displayName: string;
  totalActivities?: number;
  totalDistance?: number;   // metros
  gearTypeName?: string;
  createDate?: string;
}): Promise<void> {
  const colRef = db.collection(`users/${userId}/equipment`);

  // Buscar si ya existe un doc con ese garmin_gear_id
  const snap = await colRef.where('garmin_gear_id', '==', gearItem.gearId).limit(1).get().catch(() => null);

  const km_totales = gearItem.totalDistance != null ? Math.round((gearItem.totalDistance / 1000) * 10) / 10 : 0;

  if (snap && !snap.empty) {
    // Actualizar
    const docRef = snap.docs[0].ref;
    await docRef.set({
      nombre: gearItem.displayName,
      km_totales,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  } else {
    // Crear
    const newRef = colRef.doc();
    await newRef.set({
      nombre: gearItem.displayName,
      tipo: mapGarminGearType(gearItem.gearTypeName || ''),
      km_totales,
      garmin_gear_id: gearItem.gearId,
      fecha_inicio: gearItem.createDate || new Date().toISOString().split('T')[0],
      activo: true,
      fuente: 'garmin',
      notas: '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  }
}

// ─────────────────────────────────────────
// LLM USAGE TRACKING (ítem #17)
// ─────────────────────────────────────────

export interface LLMUsageRecord {
    provider: 'gemini' | 'groq' | 'openrouter';
    model: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    context?: string;
}

/**
 * Registra el uso de tokens de una llamada LLM en Firestore.
 * Guarda el detalle en users/{userId}/llm_usage y actualiza el resumen agregado.
 * Fire-and-forget: llamar sin await desde el worker.
 */
export async function trackLLMUsage(userId: string, usage: LLMUsageRecord): Promise<void> {
    const usageRef = db.collection(`users/${userId}/llm_usage`).doc();
    await usageRef.set({
        provider: usage.provider,
        model: usage.model,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        total_tokens: usage.total_tokens,
        context: usage.context || 'chat',
        timestamp: FieldValue.serverTimestamp()
    });

    // Actualizar resumen agregado en el documento del usuario
    const userRef = db.collection('users').doc(userId);
    const summaryUpdate: any = {
        [`llm_usage_summary.${usage.provider}.calls`]: FieldValue.increment(1),
        [`llm_usage_summary.${usage.provider}.total_tokens`]: FieldValue.increment(usage.total_tokens),
        'llm_usage_summary.last_updated': FieldValue.serverTimestamp()
    };
    await userRef.set(summaryUpdate, { merge: true });
}

// ─────────────────────────────────────────
// HITL ACTIONS (ítem #18)
// Colección: users/{userId}/hitl_actions
// ─────────────────────────────────────────

export type HitlTipo = 'aprobar_plan' | 'confirmar_borrado' | 'cambio_parametros' | 'equipo_proximo_limite';
export type HitlEstado = 'pendiente' | 'aprobado' | 'rechazado';

export interface HitlAction {
    id: string;
    tipo: HitlTipo;
    descripcion: string;
    payload: Record<string, any>;
    estado: HitlEstado;
    createdAt: any;
    resolvedAt: any;
    resolvedBy: string | null;
}

/**
 * Lista acciones HITL de un usuario. Si se pasa `estado`, filtra por ese estado.
 * Por defecto devuelve las pendientes ordenadas por fecha de creación descendente.
 */
export async function getHitlActions(userId: string, estado?: HitlEstado): Promise<HitlAction[]> {
    let query: any = db.collection(`users/${userId}/hitl_actions`).orderBy('createdAt', 'desc').limit(50);
    if (estado) {
        query = db.collection(`users/${userId}/hitl_actions`)
            .where('estado', '==', estado)
            .orderBy('createdAt', 'desc')
            .limit(50);
    }
    const snap = await query.get().catch(async () => {
        // Fallback sin orderBy si el índice no está listo
        return db.collection(`users/${userId}/hitl_actions`).limit(50).get();
    });
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as HitlAction));
}

/**
 * Crea una nueva acción HITL con estado `"pendiente"`.
 * Retorna el ID del documento creado.
 */
export async function createHitlAction(
    userId: string,
    tipo: HitlTipo,
    descripcion: string,
    payload: Record<string, any> = {}
): Promise<string> {
    const ref = db.collection(`users/${userId}/hitl_actions`).doc();
    await ref.set({
        tipo,
        descripcion,
        payload,
        estado: 'pendiente' as HitlEstado,
        createdAt: FieldValue.serverTimestamp(),
        resolvedAt: null,
        resolvedBy: null
    });
    return ref.id;
}

/**
 * Resuelve una acción HITL actualizando su estado y la marca con el timestamp y el userId que la resolvió.
 */
export async function resolveHitlAction(
    userId: string,
    actionId: string,
    decision: 'aprobado' | 'rechazado',
    resolvedBy?: string
): Promise<void> {
    const ref = db.collection(`users/${userId}/hitl_actions`).doc(actionId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`HitlAction ${actionId} no encontrada para userId ${userId}`);
    await ref.update({
        estado: decision,
        resolvedAt: FieldValue.serverTimestamp(),
        resolvedBy: resolvedBy || userId
    });
}

export async function getActivePlan(telegramId: string): Promise<any> {
  const user = await getUserByTelegramId(telegramId);
  if (!user) return null;

  const plansRef = db.collection('users').doc(user.id).collection('plans');
  const snapshot = await plansRef.orderBy('updatedAt', 'desc').limit(1).get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}
