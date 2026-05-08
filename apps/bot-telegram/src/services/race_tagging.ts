import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../memory/db.js';

export type RaceSurface = 'trail' | 'road';

export type RaceRow = {
  id: string;
  date: string; // YYYY-MM-DD
  distance_km: number;
  surface: RaceSurface;
  name?: string;
};

function toDateKeyFromTimestamp(ts: any): string | null {
  try {
    const d: Date =
      ts?.toDate?.() instanceof Date ? ts.toDate() :
      ts instanceof Date ? ts :
      typeof ts === 'string' ? new Date(ts) :
      null as any;
    if (!d || isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function dateKeyInTimeZone(d: Date, timeZone: string): string {
  // en-CA yields YYYY-MM-DD
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return fmt.format(d);
}

function toDateKeyInTimeZoneFromTimestamp(ts: any, timeZone: string): string | null {
  try {
    const d: Date =
      ts?.toDate?.() instanceof Date ? ts.toDate() :
      ts instanceof Date ? ts :
      typeof ts === 'string' ? new Date(ts) :
      null as any;
    if (!d || isNaN(d.getTime())) return null;
    return dateKeyInTimeZone(d, timeZone);
  } catch {
    return null;
  }
}

function getActivityDateKeyInTz(activity: any, timeZone: string): string | null {
  return (
    toDateKeyInTimeZoneFromTimestamp(activity?.start_time, timeZone) ||
    toDateKeyInTimeZoneFromTimestamp(activity?.timestamp, timeZone) ||
    toDateKeyInTimeZoneFromTimestamp(activity?.startTime, timeZone) ||
    toDateKeyInTimeZoneFromTimestamp(activity?.startTimeLocal, timeZone) ||
    toDateKeyInTimeZoneFromTimestamp(activity?.startTimeGMT, timeZone) ||
    null
  );
}

function km(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function raceToleranceKm(targetKm: number): number {
  // Regla práctica:
  // - Carreras cortas: tolerancia absoluta chica
  // - Carreras largas: tolerancia un poco mayor
  if (targetKm <= 1) return 0.15;
  if (targetKm <= 3) return 0.25;
  if (targetKm <= 7) return 0.4;
  if (targetKm <= 15) return 0.6;
  if (targetKm <= 30) return 1.0;
  return 1.5;
}

export async function applyRaceTagsForDate(userId: string, dateStr: string): Promise<{
  date: string;
  races: number;
  matched: number;
  updatedActivities: number;
}> {
  const racesSnap = await db.collection('users').doc(userId).collection('races')
    .where('date', '==', dateStr)
    .get();

  const races: RaceRow[] = racesSnap.docs
    .map((d: any) => ({ id: d.id, ...(d.data() || {}) }))
    .map((r: any) => ({
      id: String(r.id),
      date: String(r.date || dateStr),
      distance_km: km(r.distance_km ?? r.distanceKm ?? r.km),
      surface: (r.surface === 'trail' || r.surface === 'road') ? r.surface : (r.tipo === 'trail' ? 'trail' : 'road'),
      name: r.name ? String(r.name) : undefined
    }))
    .filter((r: RaceRow) => r.distance_km > 0);

  if (races.length === 0) return { date: dateStr, races: 0, matched: 0, updatedActivities: 0 };

  // Regla de negocio: si hay múltiples carreras registradas el mismo día,
  // SOLO la de mayor distancia cuenta como "competencia" (las menores suelen ser warmup/duplicados).
  const effectiveRaces = races.length <= 1
    ? races
    : [races.reduce((best, curr) => (curr.distance_km > best.distance_km ? curr : best), races[0])];

  // Importante: la fecha "del usuario" depende de timezone. Usamos una ventana amplia
  // y filtramos por dateKey en la TZ elegida para evitar misses por límites UTC.
  const timeZone = process.env.BIOENGINE_TIMEZONE || process.env.TZ || 'America/Montevideo';
  const baseStart = new Date(`${dateStr}T00:00:00.000Z`);
  const baseEnd = new Date(`${dateStr}T23:59:59.999Z`);
  const windowStart = new Date(baseStart.getTime() - 14 * 3600 * 1000);
  const windowEnd = new Date(baseEnd.getTime() + 14 * 3600 * 1000);
  const dayStart = Timestamp.fromDate(windowStart);
  const dayEnd = Timestamp.fromDate(windowEnd);

  // Activities for that day
  let actSnap: any;
  try {
    actSnap = await db.collection('users').doc(userId).collection('activities')
      .where('start_time', '>=', dayStart)
      .where('start_time', '<=', dayEnd)
      .get();
  } catch {
    // Fallback: fetch recent block and filter in memory (avoid index headaches)
    const recent = await db.collection('users').doc(userId).collection('activities')
      .orderBy('start_time', 'desc').limit(250).get();
    const rows = recent.docs.filter((d: any) => {
      const key = toDateKeyInTimeZoneFromTimestamp(d.data()?.start_time, timeZone);
      return key === dateStr;
    });
    actSnap = { docs: rows };
  }

  // Fallback: if there are races on this day but query returned nothing, do a bounded scan.
  // This handles legacy/migrated schemas where date field is `timestamp` or other keys.
  if ((actSnap?.docs?.length || 0) === 0 && effectiveRaces.length > 0) {
    const col = db.collection('users').doc(userId).collection('activities');
    let scan: any;
    try {
      scan = await col.orderBy('start_time', 'desc').limit(5000).get();
    } catch {
      try {
        scan = await col.orderBy('timestamp', 'desc').limit(5000).get();
      } catch {
        scan = await col.limit(5000).get();
      }
    }
    const rows = scan.docs.filter((d: any) => {
      const key = getActivityDateKeyInTz(d.data(), timeZone);
      return key === dateStr;
    });
    actSnap = { docs: rows };
  }

  const activities = actSnap.docs
    .map((d: any) => ({ id: d.id, ref: d.ref, ...(d.data() || {}) }))
    .map((a: any) => ({
      id: String(a.id),
      ref: a.ref,
      start_time: a.start_time ?? a.timestamp ?? a.startTime ?? a.startTimeLocal ?? a.startTimeGMT ?? null,
      distance_km: km(a.distance_km ?? a.distanceKm),
      type: a.type ? String(a.type) : undefined,
      existingRace: a.race || null,
      existingTipo: a.tipo ? String(a.tipo) : null,
      existingSurface: a.surface ? String(a.surface) : null
    }))
    .filter((a: any) => {
      if (!(a.distance_km > 0)) return false;
      const key = toDateKeyInTimeZoneFromTimestamp(a.start_time, timeZone);
      return key === dateStr;
    });

  if (activities.length === 0) return { date: dateStr, races: effectiveRaces.length, matched: 0, updatedActivities: 0 };

  // Limpieza: si hubo un match anterior, puede haber quedado `tipo/race/surface` en warmups.
  // Para este día, borramos tags previos generados por este mismo mecanismo antes de recalcular.
  try {
    const toClear = activities.filter((a: any) => {
      // Caso 1: marcado explícitamente por nuestro tagging
      if (a.existingRace?.source === 'users/{uid}/races') return true;
      // Caso 2: quedó `tipo` de competencia pegado sin `race` (estado antiguo / bug previo)
      if (!a.existingRace && a.existingTipo && a.existingTipo.toLowerCase().includes('competición')) return true;
      return false;
    });
    if (toClear.length > 0) {
      const clearBatch = db.batch();
      for (const a of toClear) {
        clearBatch.set(a.ref, {
          race: FieldValue.delete(),
          surface: FieldValue.delete(),
          tipo: FieldValue.delete(),
          updated_at: FieldValue.serverTimestamp()
        }, { merge: true });
      }
      await clearBatch.commit();
    }
  } catch (clearErr: any) {
    console.warn(`[RaceTagging] Clear previous tags failed (${dateStr}): ${clearErr.message || clearErr}`);
  }

  // Match: for each race, pick best activity by abs distance diff under tolerance.
  // Avoid assigning warmups when multiple activities exist the same day:
  // - Greedy by larger races first, so the big one claims the main activity.
  // - Each activity can be matched once.
  const racesSorted = [...effectiveRaces].sort((a, b) => b.distance_km - a.distance_km);
  const usedActivityIds = new Set<string>();
  const updates: Array<{ ref: any; patch: any }> = [];
  let matched = 0;

  for (const race of racesSorted) {
    const tol = raceToleranceKm(race.distance_km);
    let best: any = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const act of activities) {
      if (usedActivityIds.has(act.id)) continue;
      const diff = Math.abs(act.distance_km - race.distance_km);
      if (diff > tol) continue;

      // Prefer activity types that look like running if present, but don't block if unknown.
      const type = (act.type || '').toLowerCase();
      const typePenalty = (type && !type.includes('run') && !type.includes('running')) ? 0.15 : 0;

      const score = diff + typePenalty;
      if (score < bestScore) {
        bestScore = score;
        best = { ...act, diff_km: diff };
      }
    }

    if (!best) continue;
    usedActivityIds.add(best.id);
    matched++;

    updates.push({
      ref: best.ref,
      patch: {
        // Esto es lo que consume el dashboard (`act.tipo` tiene prioridad en normalizeActivityType)
        tipo: race.surface === 'trail' ? 'Competición Trail' : 'Competición Calle',
        race: {
          matched: true,
          surface: race.surface,
          raceId: race.id,
          raceName: race.name || null,
          raceDistanceKm: race.distance_km,
          activityDistanceKm: best.distance_km,
          diffKm: +best.diff_km.toFixed(3),
          source: 'users/{uid}/races',
          matchedAt: FieldValue.serverTimestamp()
        },
        // Convenience fields for analytics/UI
        surface: race.surface,
        updated_at: FieldValue.serverTimestamp()
      }
    });
  }

  if (updates.length === 0) return { date: dateStr, races: effectiveRaces.length, matched: 0, updatedActivities: 0 };

  const batch = db.batch();
  for (const u of updates) batch.set(u.ref, u.patch, { merge: true });
  await batch.commit();

  return { date: dateStr, races: effectiveRaces.length, matched, updatedActivities: updates.length };
}
