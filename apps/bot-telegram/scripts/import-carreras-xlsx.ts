import 'dotenv/config';
import * as adminNS from 'firebase-admin';
import { resolve } from 'path';
import * as fs from 'fs';
import * as xlsxNS from 'xlsx';

// ESM/CJS interop: `xlsx` sometimes exposes functions under `.default`.
const xlsxLib: any = (xlsxNS as any).default ?? xlsxNS;
const adminLib: any = (adminNS as any).default ?? adminNS;

type Surface = 'trail' | 'road';

type RaceRow = {
  date: string; // YYYY-MM-DD
  distance_km: number;
  surface: Surface;
  name: string;
  source_sheet: string;
};

function usage(): never {
  console.error('Usage: tsx scripts/import-carreras-xlsx.ts --user <uid> [--file <path>] [--sheets Gonzalo] [--range A23:I40] [--purge true]');
  process.exit(2);
}

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const val = argv[i + 1];
    if (!val || val.startsWith('--')) out[key] = 'true';
    else { out[key] = val; i++; }
  }
  return out;
}

function parseA1Range(a1: string): { sCol: number; sRow: number; eCol: number; eRow: number } {
  const m = a1.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (!m) throw new Error(`Invalid range: ${a1} (expected like A23:I40)`);
  const colToNum = (col: string) => {
    let n = 0;
    for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n;
  };
  return { sCol: colToNum(m[1]), sRow: Number(m[2]), eCol: colToNum(m[3]), eRow: Number(m[4]) };
}

function normalizeSurface(v: any): Surface | null {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'trail' || s.includes('trail')) return 'trail';
  if (s === 'calle' || s === 'road' || s.includes('asfalto') || s.includes('calle')) return 'road';
  return null;
}

function toDateKey(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().split('T')[0];
  if (typeof v === 'number') {
    // Excel date serial
    const d = xlsxLib.SSF?.parse_date_code ? xlsxLib.SSF.parse_date_code(v) : null;
    if (!d) return null;
    const dt = new Date(Date.UTC(d.y, (d.m || 1) - 1, d.d || 1));
    return dt.toISOString().split('T')[0];
  }
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
    // Common LATAM dd/mm/yyyy
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const dd = Number(m[1]), mm = Number(m[2]), yy = Number(m[3]);
      const dt2 = new Date(Date.UTC(yy, mm - 1, dd));
      return dt2.toISOString().split('T')[0];
    }
  }
  return null;
}

function toKm(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase().replace(',', '.');
    if (!s) return 0;
    const m = s.match(/(\d+(\.\d+)?)/);
    if (!m) return 0;
    return Number(m[1]);
  }
  return 0;
}

function normalizeName(v: any): string {
  const s = (v == null ? '' : String(v)).trim();
  return s.replace(/\s+/g, ' ').slice(0, 160);
}

function slugId(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'race';
}

function buildRaceId(r: { date: string; surface: Surface; distance_km: number; name: string }): string {
  const km100 = Math.round(r.distance_km * 100);
  return `${r.date}_${r.surface}_${km100}_${slugId(r.name)}`;
}

function extractRacesFromSheet(sheetName: string, ws: xlsx.WorkSheet): RaceRow[] {
  // Read as 2D array for robust header detection
  const rows = xlsxLib.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true, defval: null });
  const out: RaceRow[] = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    // Find header anchors
    const dateCol = row.findIndex((c: any) => String(c || '').trim().toLowerCase() === 'fecha');
    if (dateCol < 0) continue;

    // We accept either "Carrera" (road) or "Trail" (trail) as the name column.
    const nameCol = row.findIndex((c: any) => {
      const s = String(c || '').trim().toLowerCase();
      return s === 'carrera' || s === 'trail';
    });
    if (nameCol < 0) continue;

    const distCol = row.findIndex((c: any) => String(c || '').trim().toLowerCase() === 'distancia');
    if (distCol < 0) continue;

    const surface: Surface = String(row[nameCol] || '').trim().toLowerCase() === 'trail' ? 'trail' : 'road';

    // Consume data rows until blank date
    for (let rr = r + 1; rr < rows.length; rr++) {
      const dataRow = rows[rr] || [];
      const dateKey = toDateKey(dataRow[dateCol]);
      if (!dateKey) break;
      const name = normalizeName(dataRow[nameCol]);
      const distanceKm = toKm(dataRow[distCol]);
      if (!name || distanceKm <= 0) continue;
      out.push({
        date: dateKey,
        distance_km: +distanceKm.toFixed(3),
        surface,
        name,
        source_sheet: sheetName
      });
    }
  }

  // Deduplicate inside sheet
  const seen = new Set<string>();
  return out.filter((r) => {
    const k = `${r.date}|${r.surface}|${Math.round(r.distance_km * 100)}|${r.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function extractRacesFromRange(sheetName: string, ws: xlsx.WorkSheet, rangeA1: string): RaceRow[] {
  const { sCol, sRow, eCol, eRow } = parseA1Range(rangeA1);
  const rows: any[][] = [];
  for (let r = sRow; r <= eRow; r++) {
    const arr: any[] = [];
    for (let c = sCol; c <= eCol; c++) {
      const addr = xlsxLib.utils.encode_cell({ r: r - 1, c: c - 1 });
      arr.push((ws as any)[addr]?.v ?? (ws as any)[addr]?.w ?? null);
    }
    rows.push(arr);
  }

  if (rows.length < 2) return [];
  const header = rows[0].map((h) => String(h || '').trim().toLowerCase());
  const idxFecha = header.indexOf('fecha');
  const idxNombre = header.indexOf('nombre');
  const idxDist = header.indexOf('distancia');
  const idxTipo = header.indexOf('tipo');
  if (idxFecha < 0 || idxNombre < 0 || idxDist < 0 || idxTipo < 0) {
    throw new Error(`Headers not found in ${sheetName}!${rangeA1} (expected Fecha/Nombre/Distancia/Tipo)`);
  }

  const out: RaceRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateKey = toDateKey(row[idxFecha]);
    if (!dateKey) continue;
    const name = normalizeName(row[idxNombre]);
    const distanceKm = toKm(row[idxDist]);
    const surface = normalizeSurface(row[idxTipo]);
    if (!name || distanceKm <= 0 || !surface) continue;
    out.push({
      date: dateKey,
      distance_km: +distanceKm.toFixed(3),
      surface,
      name,
      source_sheet: sheetName
    });
  }

  const seen = new Set<string>();
  return out.filter((r) => {
    const k = `${r.date}|${r.surface}|${Math.round(r.distance_km * 100)}|${r.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function ensureAdminInitialized() {
  if (adminLib.apps?.length > 0) return;

  // Prefer explicit service account JSON when running locally.
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : null;

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const json = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    adminLib.initializeApp({
      credential: adminLib.credential.cert(json),
      projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || json.project_id
    });
    return;
  }

  // Fallback: ADC (gcloud auth application-default login)
  adminLib.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'bioengine-v4'
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const userId = args.user;
  if (!userId) usage();

  const filePath = resolve(args.file || resolve(process.cwd(), '..', '..', 'Carreras.xlsx'));
  if (!fs.existsSync(filePath)) {
    console.error(`Carreras.xlsx not found: ${filePath}`);
    process.exit(1);
  }

  const sheetsFilter = (args.sheets || 'Gonzalo')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const range = args.range || 'A23:I40';

  if (typeof xlsxLib.readFile !== 'function') {
    throw new Error('xlsx.readFile not available (ESM import mismatch)');
  }
  const wb = xlsxLib.readFile(filePath, { cellDates: true });
  const sheetNames = wb.SheetNames.filter((n) => sheetsFilter.length === 0 || sheetsFilter.includes(n));

  const races: RaceRow[] = [];
  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    if (name === 'Gonzalo') races.push(...extractRacesFromRange(name, ws, range));
    else races.push(...extractRacesFromSheet(name, ws));
  }

  if (races.length === 0) {
    console.error('No races extracted. Check sheet names / headers in Carreras.xlsx.');
    process.exit(1);
  }

  await ensureAdminInitialized();
  const db = adminLib.firestore();

  const purge = String(args.purge || '').toLowerCase() === 'true';
  if (purge) {
    // Purge only docs that were previously imported from this Excel, for this user.
    // This avoids leaving stale races (e.g., from other sheets like "Ale") when you reimport only Gonzalo.
    const racesCol = db.collection('users').doc(userId).collection('races');
    const snap = await racesCol.where('source', '==', 'Carreras.xlsx').get();
    let delBatch = db.batch();
    let delOps = 0;
    let deleted = 0;
    for (const doc of snap.docs) {
      delBatch.delete(doc.ref);
      delOps++;
      deleted++;
      if (delOps >= 450) {
        await delBatch.commit();
        delBatch = db.batch();
        delOps = 0;
      }
    }
    if (delOps > 0) await delBatch.commit();
    console.log(JSON.stringify({ status: 'purged', userId, deleted }, null, 2));
  }

  let written = 0;
  // Firestore batch max 500 ops
  let batch = db.batch();
  let ops = 0;

  for (const race of races) {
    const id = buildRaceId(race);
    const ref = db.collection('users').doc(userId).collection('races').doc(id);
    batch.set(ref, {
      date: race.date,
      distance_km: race.distance_km,
      surface: race.surface,
      name: race.name,
      source: 'Carreras.xlsx',
      source_sheet: race.source_sheet,
      updated_at: adminLib.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    ops++;
    written++;
    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  console.log(JSON.stringify({ status: 'ok', userId, races: races.length, written }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
