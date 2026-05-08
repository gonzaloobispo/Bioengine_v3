/**
 * BioEngine Plans Service — Firestore-native
 * Genera, modifica y evalúa planes de entrenamiento directamente en Firestore.
 * No depende del backend Python local.
 */

// ─────────────────────────────────────────
// TRAZABILIDAD DE PROMPTS (Ítem 12)
// Incrementar manualmente cada vez que cambie el prompt del coach.
// ─────────────────────────────────────────
const COACH_PROMPT_VERSION = 'v2.2';

import { FieldValue } from 'firebase-admin/firestore';
import { db, classifyActivity, createHitlAction } from '../memory/db.js';
import { ENV } from '../config.js';

// ─────────────────────────────────────────
// HELPERS FIRESTORE
// ─────────────────────────────────────────

async function getUserId(requestUserId?: string): Promise<string> {
    if (!requestUserId) throw new Error('userId is required — no anonymous fallback allowed');
    return requestUserId;
}

async function getRecentActivitiesForPlan(userId: string, limit = 30): Promise<any[]> {
    try {
        // Intentamos ordenar por 'timestamp', fallback a sin orden si no hay índice
        const snap = await db.collection('users').doc(userId)
            .collection('activities')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
        return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } catch {
        // Sin índice: traemos sin orden y ordenamos en memoria
        const snap = await db.collection('users').doc(userId)
            .collection('activities')
            .limit(limit)
            .get();
        const docs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        return docs.sort((a: any, b: any) => {
            const ta = a.start_time?.toMillis?.() || a.timestamp?.toMillis?.() || new Date(a.start_time || a.date || 0).getTime();
            const tb = b.start_time?.toMillis?.() || b.timestamp?.toMillis?.() || new Date(b.start_time || b.date || 0).getTime();
            return tb - ta;
        });
    }
}

async function getRecentHealthForPlan(userId: string, limit = 14): Promise<any[]> {
    try {
        const snap = await db.collection('users').doc(userId)
            .collection('daily_health')
            .orderBy('updatedAt', 'desc')
            .limit(limit)
            .get();
        return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } catch {
        const snap = await db.collection('users').doc(userId)
            .collection('daily_health')
            .limit(limit)
            .get();
        const docs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        return docs.sort((a: any, b: any) => {
            const ta = a.updatedAt?.toMillis?.() || new Date(a.date || 0).getTime();
            const tb = b.updatedAt?.toMillis?.() || new Date(b.date || 0).getTime();
            return tb - ta;
        });
    }
}

// Busca el peso más reciente tanto en biometrics (Withings) como en daily_health
async function getRecentWeightData(userId: string, limit = 10): Promise<any[]> {
    const results: any[] = [];

    // Fuente 1: colección biometrics (datos de Withings — weightKg o weight_kg)
    try {
        const bioSnap = await db.collection('users').doc(userId)
            .collection('biometrics')
            .limit(50)
            .get();
        bioSnap.docs.forEach((d: any) => {
            const data = d.data();
            const w = data.weight_kg ?? data.weightKg ?? null;
            if (w != null) {
                results.push({
                    date: data.date || d.id,
                    weight_kg: +Number(w).toFixed(2),
                    fat_percent: data.fat_percent ?? null,
                    muscle_percent: data.muscle_percent ?? null,
                    source: 'withings'
                });
            }
        });
    } catch { /* sin biometrics — continúa */ }

    // Fuente 2: daily_health (campo weight_kg o peso_kg)
    try {
        const healthSnap = await db.collection('users').doc(userId)
            .collection('daily_health')
            .limit(30)
            .get();
        healthSnap.docs.forEach((d: any) => {
            const data = d.data();
            const w = data.weight_kg ?? data.peso_kg ?? null;
            if (w != null) {
                results.push({
                    date: data.date || d.id,
                    weight_kg: +Number(w).toFixed(2),
                    source: 'daily_health'
                });
            }
        });
    } catch { /* sin daily_health con peso — continúa */ }

    // Ordenar por fecha descendente y devolver los N más recientes
    return results
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
}

async function getActivePlanFromFirestore(userId: string): Promise<any | null> {
    try {
        // Requiere índice compuesto (status ASC + updatedAt DESC)
        const snap = await db.collection('users').doc(userId)
            .collection('plans')
            .where('status', '==', 'active')
            .orderBy('updatedAt', 'desc')
            .limit(1)
            .get();
        if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    } catch {
        // Índice aún construyéndose — fallback sin índice compuesto
    }

    // Fallback: traer todos los planes y filtrar en memoria
    try {
        const all = await db.collection('users').doc(userId)
            .collection('plans')
            .limit(20)
            .get();
        if (all.empty) return null;
        const docs: any[] = all.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        const active = docs.filter(d => d.status === 'active');
        if (active.length > 0) {
            return active.sort((a, b) => {
                const ta = a.updatedAt?.toMillis?.() || new Date(a.updatedAt || 0).getTime();
                const tb = b.updatedAt?.toMillis?.() || new Date(b.updatedAt || 0).getTime();
                return tb - ta;
            })[0];
        }
        // Sin plan activo: devolver el más reciente
        return docs.sort((a, b) => {
            const ta = a.updatedAt?.toMillis?.() || new Date(a.updatedAt || 0).getTime();
            const tb = b.updatedAt?.toMillis?.() || new Date(b.updatedAt || 0).getTime();
            return tb - ta;
        })[0] || null;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────
// CÁLCULO DE ACWR
// ─────────────────────────────────────────

function getLoad(a: any): number {
    // Garmin training_load es escala ~0-10. Normalizar a ~0-200 (×20)
    if (a.training_load && Number(a.training_load) > 0) {
        return Number(a.training_load) * 20;
    }
    const durationH = (Number(a.duration_min) || 30) / 60;
    const hr = Number(a.avg_heart_rate || a.avg_hr) || 130;
    const intensity = hr / 150;
    return durationH * intensity * 100;
}

function getActivityTime(a: any): number {
    if (a.start_time?.toMillis) return a.start_time.toMillis();
    if (a.timestamp?.toMillis) return a.timestamp.toMillis();
    if (a.start_time) return new Date(a.start_time).getTime();
    if (a.date) return new Date(a.date).getTime();
    return 0;
}

function calcACWR(activities: any[]): number {
    const now = Date.now();
    const MS_DAY = 86400000;

    const acute = activities
        .filter(a => now - getActivityTime(a) <= 7 * MS_DAY)
        .reduce((sum, a) => sum + getLoad(a), 0) / 7;

    const chronic = activities
        .filter(a => now - getActivityTime(a) <= 28 * MS_DAY)
        .reduce((sum, a) => sum + getLoad(a), 0) / 28;

    return chronic > 0 ? +(acute / chronic).toFixed(2) : 1.0;
}

interface ACWRByType {
    global: { acute: number; chronic: number; ratio: number };
    impact: { acute: number; chronic: number; ratio: number };    // running + tenis
    lowImpact: { acute: number; chronic: number; ratio: number }; // ciclismo + natación
}

function isHighImpact(a: any): boolean {
    const t = (a.activity_type ?? a.type ?? a.nombre ?? '').toLowerCase();
    return t.includes('run') || t.includes('trail') || t.includes('tenis') || t.includes('tennis');
}

function isLowImpact(a: any): boolean {
    const t = (a.activity_type ?? a.type ?? a.nombre ?? '').toLowerCase();
    return t.includes('cycl') || t.includes('bike') || t.includes('bici') || t.includes('swim') || t.includes('natac');
}

function calcACWRByType(activities: any[]): ACWRByType {
    const now = Date.now();
    const MS_DAY = 86400000;

    const acuteWindow = activities.filter(a => now - getActivityTime(a) <= 7 * MS_DAY);
    const chronicWindow = activities.filter(a => now - getActivityTime(a) <= 28 * MS_DAY);

    const sum = (arr: any[]) => arr.reduce((s, a) => s + getLoad(a), 0);

    const gAcute = sum(acuteWindow) / 7;
    const gChronic = sum(chronicWindow) / 28;

    const iAcute = sum(acuteWindow.filter(isHighImpact)) / 7;
    const iChronic = sum(chronicWindow.filter(isHighImpact)) / 28;

    const lAcute = sum(acuteWindow.filter(isLowImpact)) / 7;
    const lChronic = sum(chronicWindow.filter(isLowImpact)) / 28;

    const ratio = (a: number, c: number) => c > 0 ? +(a / c).toFixed(2) : 1.0;

    return {
        global:    { acute: +gAcute.toFixed(1), chronic: +gChronic.toFixed(1), ratio: ratio(gAcute, gChronic) },
        impact:    { acute: +iAcute.toFixed(1), chronic: +iChronic.toFixed(1), ratio: ratio(iAcute, iChronic) },
        lowImpact: { acute: +lAcute.toFixed(1), chronic: +lChronic.toFixed(1), ratio: ratio(lAcute, lChronic) },
    };
}

function acwrStatus(acwr: number): string {
    if (acwr < 0.8) return 'subestimulación — aumentar carga gradualmente';
    if (acwr <= 1.3) return 'zona óptima';
    if (acwr <= 1.5) return 'carga elevada — priorizar recuperación';
    return 'PELIGRO — riesgo de lesión, reducir inmediatamente';
}

// ─────────────────────────────────────────
// CONTEXT CACHING GEMINI (E5.3)
// ─────────────────────────────────────────

// System prompt estático del coach — candidato ideal para context caching
const COACH_SYSTEM_PROMPT = `Eres el coach deportivo personal de Gonzalo, especialista en periodización del entrenamiento para deportistas multidisciplina (trail running, ciclismo, tenis, fuerza). Tu metodología se basa en:
- Periodización progresiva con ciclos de carga/descarga (3:1 o 4:1)
- Principio ACWR para gestionar el ratio carga aguda/crónica
- Adaptación al perfil médico del atleta (betabloqueantes, condropatía patelofemoral, pronación severa)
- Zonas de FC calculadas por fórmula de Brawner/Tanaka ajustadas a medicación
- Respeto de la disponibilidad horaria y restricciones de disciplina por día de la semana
Siempre respondes en español y en formato JSON estricto cuando se te pide.`;

// Caché del nombre de caché de Gemini — persiste mientras la Cloud Function esté caliente
let geminiCacheName: string | null = null;
let geminiCacheExpiry: number = 0;

/**
 * Intenta crear (o reutilizar) el context cache de Gemini.
 * Retorna el cacheName si tiene éxito, null si la API no está disponible.
 */
async function getOrCreateGeminiCache(): Promise<string | null> {
    try {
        const now = Date.now();
        // Reusar si el caché todavía es válido (margen de 5 minutos)
        if (geminiCacheName && now < geminiCacheExpiry - 5 * 60 * 1000) {
            return geminiCacheName;
        }

        const apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) return null;

        // Importación dinámica para no romper si no está disponible
        const { GoogleGenerativeAI } = await import('@google/generative-ai').catch(() => ({ GoogleGenerativeAI: null }));
        if (!GoogleGenerativeAI) return null;

        const genAI = new GoogleGenerativeAI(apiKey);

        // Verificar si el modelo soporta caching consultando la API de caches
        // @ts-ignore — CachingService puede no estar tipado en todas las versiones
        const cachingService = genAI.getGenerativeModelFromCachedContent
            ? null // API v2 — skipear
            : null;

        // Context Caching usa la API REST directa — usar fetch nativo
        const modelName = 'models/gemini-2.0-flash-001';
        const ttlSeconds = 3600; // 1 hora

        const createBody = {
            model: modelName,
            contents: [{
                role: 'user',
                parts: [{ text: COACH_SYSTEM_PROMPT }]
            }],
            ttl: `${ttlSeconds}s`,
            displayName: 'bioengine-coach-system-prompt'
        };

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createBody)
            }
        );

        if (!response.ok) {
            // Context caching no disponible en este modelo/plan — degradar silenciosamente
            return null;
        }

        const data = await response.json() as any;
        if (data.name) {
            geminiCacheName = data.name;
            geminiCacheExpiry = now + ttlSeconds * 1000;
            return geminiCacheName;
        }
        return null;
    } catch {
        // Context caching no disponible — no romper el flujo
        return null;
    }
}

// ─────────────────────────────────────────
// LLAMADA A GEMINI
// ─────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
    // Intentar adjuntar el context cache si está disponible
    // (no bloquea si falla — degradación silenciosa)
    await getOrCreateGeminiCache().catch(() => null);

    const { chatCompletion } = await import('../agent/llm.js');
    const result = await chatCompletion([
        { role: 'user', content: prompt }
    ]);
    return result.content || '';
}

// Preferir salida estructurada cuando Gemini lo soporta. Esto reduce casos de JSON truncado.
async function callGeminiJson(prompt: string, opts?: { allowTextFallback?: boolean }): Promise<any> {
    if (!ENV.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY missing');
    }
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2048,
                // @google/generative-ai soporta responseMimeType en versiones modernas.
                // Si la versión en runtime no lo soporta, caerá al catch y usamos callGemini+extractJSON.
                responseMimeType: 'application/json'
            } as any
        } as any);

        const geminiTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini JSON timeout (40s)')), 40000)
        );
        const res = await Promise.race([
            model.generateContent([{ text: prompt }]),
            geminiTimeout
        ]) as any;
        const text = res?.response?.text?.() || '';
        return JSON.parse(text);
    } catch (e) {
        if (opts?.allowTextFallback === false) throw e;
        // Fallback: texto libre + extracción/repair (puede implicar más llamadas).
        const raw = await callGemini(prompt);
        return extractJSONWithRepair(raw, 'callGeminiJson');
    }
}

function extractJSON(text: string): any {
    // Intenta parsear directo
    try { return JSON.parse(text); } catch { /* continúa */ }
    // Extrae bloque ```json ... ```
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
        try { return JSON.parse(match[1].trim()); } catch { /* continúa */ }
    }
    // Extrae desde primer { hasta último }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        try { return JSON.parse(text.slice(start, end + 1)); } catch { /* continúa */ }
    }
    throw new Error('Gemini no devolvió JSON válido. Respuesta: ' + text.slice(0, 200));
}

async function extractJSONWithRepair(rawResponse: string, contextLabel: string): Promise<any> {
    try {
        return extractJSON(rawResponse);
    } catch (e: any) {
        const errMsg = e?.message || String(e);
        console.warn(`[${contextLabel}] JSON parse failed; attempting repair. Error: ${errMsg}`);

        const extraRules = contextLabel === 'generatePlan'
            ? `RESTRICCIONES EXTRA (para evitar truncado):
- "sessions" debe tener como máximo 7 elementos
- Usa SOLO estos campos por sesión: date, session_idx, title, type, duration_min, intensity, notes, status
- "notes" debe ser corto (<= 140 caracteres) y en una sola línea
- NO incluyas texto fuera del JSON`
            : '';

        const repairPrompt = `Tu respuesta anterior NO era JSON válido o estaba incompleta/truncada.

Devuelve ÚNICAMENTE el JSON completo y válido, sin markdown y sin texto adicional.
${extraRules ? `\n\n${extraRules}\n` : ''}

RESPUESTA ANTERIOR:
${rawResponse}`;

        // Intentar JSON mode primero (si está disponible), para evitar truncado en el "repair".
        try {
            return await callGeminiJson(repairPrompt);
        } catch {
            const fixed = await callGemini(repairPrompt);
            return extractJSON(fixed);
        }
    }
}

// ─────────────────────────────────────────
// FC MÁXIMA CON AJUSTE POR MEDICACIÓN
// ─────────────────────────────────────────

/**
 * Calcula la FC máxima ajustada según perfil.
 * - Usa fecha de nacimiento si está disponible; de lo contrario usa edad o default 49.
 * Calcula FC Máxima y zonas de entrenamiento usando las fórmulas del ContextManager:
 * - Hombres: Tanaka (2001): 208 - (0.7 × edad)
 * - Mujeres: Gulati (2010): 206 - (0.88 × edad)
 * - Beta-bloqueantes (Atenolol, etc.): reducción del 25% (fórmula de Brawner)
 * - Edad calculada con precisión al día (no suma el año si el cumpleaños no pasó)
 */
function calcAge(fechaNacimiento: string): number {
    const birth = new Date(fechaNacimiento);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const birthdayThisYear = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    if (today < birthdayThisYear) age--;
    return age;
}

export function calcMaxHRAndZones(profile: any): { mhr: number; formula: string; zones: Record<string, { range: [number, number]; desc: string }> } {
    let age = 49;
    if (profile?.fechaNacimiento) {
        age = calcAge(profile.fechaNacimiento);
    } else if (profile?.edad) {
        age = Number(profile.edad);
    }

    const gender: string = (profile?.sexo || 'masculino').toLowerCase();
    const isFemale = /femen|mujer|female|f$/i.test(gender);

    // Fórmulas científicas por sexo (portadas desde ContextManager.py)
    let mhrBase: number;
    let formulaBase: string;
    if (isFemale) {
        mhrBase = 206 - (0.88 * age);  // Gulati (2010)
        formulaBase = 'Gulati';
    } else {
        mhrBase = 208 - (0.7 * age);   // Tanaka (2001)
        formulaBase = 'Tanaka';
    }

    // Ajuste por beta-bloqueantes: -25% (Brawner)
    const meds: string[] = Array.isArray(profile?.medicaciones) ? profile.medicaciones : [];
    const hasBetaBlocker = meds.some(m =>
        /atenolol|metoprolol|bisoprolol|carvedilol|propranolol/i.test(m)
    );
    const mhr = hasBetaBlocker ? Math.round(mhrBase * 0.75) : Math.round(mhrBase);
    const formula = hasBetaBlocker ? `${formulaBase} (Adj. Atenolol -25%)` : `${formulaBase} (Standard)`;

    const zones: Record<string, { range: [number, number]; desc: string }> = {
        Z1: { range: [Math.round(mhr * 0.50), Math.round(mhr * 0.60)], desc: 'Recuperación / Calentamiento' },
        Z2: { range: [Math.round(mhr * 0.60), Math.round(mhr * 0.70)], desc: 'Aeróbico / Quema de grasa' },
        Z3: { range: [Math.round(mhr * 0.70), Math.round(mhr * 0.80)], desc: 'Tempo / Resistencia aeróbica' },
        Z4: { range: [Math.round(mhr * 0.80), Math.round(mhr * 0.90)], desc: 'Umbral Anaeróbico' },
        Z5: { range: [Math.round(mhr * 0.90), mhr],                    desc: 'VO2 Máximo / Esfuerzo Máximo' },
    };

    return { mhr, formula, zones };
}

// Compatibilidad: función simple que retorna solo el MHR
function calcMaxHR(profile: any): number {
    return calcMaxHRAndZones(profile).mhr;
}

function isValidPlanSessions(sessions: any, startDate: string): { ok: boolean; reason?: string } {
    if (!Array.isArray(sessions)) return { ok: false, reason: 'sessions no es array' };
    if (sessions.length < 14) return { ok: false, reason: `sessions demasiado corto (${sessions.length})` };

    // Validar 14 fechas consecutivas desde startDate
    const expected: string[] = [];
    for (let i = 0; i < 14; i++) {
        const d = new Date(startDate + 'T12:00:00');
        d.setDate(d.getDate() + i);
        expected.push(d.toISOString().split('T')[0]);
    }
    const seen = new Set<string>();
    for (const s of sessions) {
        const dt = s?.date;
        if (typeof dt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dt)) return { ok: false, reason: 'session.date inválido' };
        seen.add(dt);
    }
    const missing = expected.filter(d => !seen.has(d));
    if (missing.length > 0) return { ok: false, reason: `faltan fechas: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}` };

    // Reglas duras: ciclismo SOLO fin de semana y ambos días obligatorios.
    // y fortalecimiento en días hábiles no-descanso.
    const dayOfWeek = (dateStr: string) => new Date(dateStr + 'T12:00:00').getDay(); // 0 dom .. 6 sáb
    const isWeekend = (dow: number) => dow === 0 || dow === 6;

    let hasSatCycling = false;
    let hasSunCycling = false;
    let weekdayCyclingCount = 0;
    let weekdayStrengthCount = 0;

    const normType = (t: any) => String(t || '').toLowerCase();
    for (const s of sessions) {
        const dt = s?.date;
        const dow = dayOfWeek(dt);
        const t = normType(s?.type);
        if (t.includes('cycl')) {
            if (!isWeekend(dow)) weekdayCyclingCount++;
            if (dow === 6) hasSatCycling = true;
            if (dow === 0) hasSunCycling = true;
        }
        if (!isWeekend(dow)) {
            const isRest = t === 'rest' || t === 'recovery' || t === 'off';
            if (!isRest && (t === 'strength' || t.includes('fuerza'))) weekdayStrengthCount++;
        }
    }

    if (weekdayCyclingCount > 0) return { ok: false, reason: 'ciclismo en día de semana' };
    if (!hasSatCycling || !hasSunCycling) return { ok: false, reason: 'ciclismo falta en sábado o domingo' };
    if (weekdayStrengthCount < 2) return { ok: false, reason: 'faltan sesiones de fuerza en días hábiles (min 2)' };
    return { ok: true };
}

async function repairPlanToFullCalendar(plan: any, startDate: string): Promise<any> {
    const prompt = `Tu JSON de plan está incompleto o no respeta reglas duras. Debes devolver un JSON válido con EXACTAMENTE 14 sesiones (una por cada día) desde ${startDate} por 14 días consecutivos.
Incluye días de descanso como sesiones con type="rest" y status="pending".
No uses markdown. No agregues texto fuera del JSON.
Usa SOLO estos campos por sesión: date, session_idx, title, type, duration_min, intensity, notes, status.

REGLAS DURAS OBLIGATORIAS:
- Ciclismo: SIEMPRE sábado y domingo (ambos días), y SOLO esos días (nunca lunes a viernes).
- Fuerza (strength): mínimo 2 sesiones por semana en días hábiles, separadas por 48h si es posible.
- Si un día es descanso, usa type="rest" y duration_min=0 e intensity="rest".

CALENDARIO OBLIGATORIO (14 días):
${(() => {
    const lines: string[] = [];
    const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    for (let i = 0; i < 14; i++) {
        const d = new Date(startDate + 'T12:00:00');
        d.setDate(d.getDate() + i);
        lines.push(`${d.toISOString().split('T')[0]} (${DAY_NAMES[d.getDay()]})`);
    }
    return lines.join('\n');
})()}

JSON ACTUAL (INCOMPLETO):
${JSON.stringify(plan)}`;

    // Preferir JSON mode para el repair.
    return await callGeminiJson(prompt);
}

async function repairPlanForceSchema(plan: any, startDate: string, reason: string): Promise<any> {
    const prompt = `Tu JSON sigue siendo inválido: ${reason}.
Devuelve ÚNICAMENTE un JSON válido con esta forma exacta:
{
  "plan_name": "string",
  "start_date": "${startDate}",
  "acwr_at_generation": number,
  "sessions": [
    { "date":"YYYY-MM-DD","session_idx":1,"title":"string","type":"running|cycling|strength|tennis|rest|recovery","duration_min":0,"intensity":"Z1|Z2|Z3|Z4|Z5|mixed|rest","notes":"","status":"pending" }
  ],
  "coach_rationale": "string"
}

REGLAS DURAS:
- sessions: EXACTAMENTE 14 elementos (uno por día) desde ${startDate} consecutivo.
- ciclismo: sábado y domingo (ambos) y NUNCA lunes-viernes.
- fuerza: mínimo 2 sesiones en días hábiles.
- descanso: type="rest", duration_min=0, intensity="rest".

JSON ACTUAL:
${JSON.stringify(plan)}`;

    return await callGeminiJson(prompt, { allowTextFallback: false });
}

function buildDeterministicPlan(startDate: string, acwr: number): any {
    const sessions: any[] = [];
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    let idx = 1;

    for (let i = 0; i < 14; i++) {
        const d = new Date(startDate + 'T12:00:00');
        d.setDate(d.getDate() + i);
        const date = d.toISOString().split('T')[0];
        const dow = d.getDay(); // 0 dom ... 6 sab

        // Regla dura: ciclismo ambos días del fin de semana, nunca en semana.
        if (dow === 6) {
            sessions.push({
                date,
                session_idx: idx++,
                title: 'Ciclismo largo',
                type: 'cycling',
                duration_min: 100,
                intensity: 'Z2',
                notes: 'Sesión principal del sábado.',
                status: 'pending'
            });
            continue;
        }
        if (dow === 0) {
            sessions.push({
                date,
                session_idx: idx++,
                title: 'Ciclismo regenerativo',
                type: 'cycling',
                duration_min: 75,
                intensity: 'Z1',
                notes: 'Sesión secundaria del domingo.',
                status: 'pending'
            });
            continue;
        }

        // Semana: 2 días de fuerza (mar/jue), 1 running suave (lun), resto descanso.
        if (dow === 2 || dow === 4) {
            sessions.push({
                date,
                session_idx: idx++,
                title: 'Fuerza funcional',
                type: 'strength',
                duration_min: 55,
                intensity: 'mixed',
                notes: 'Trabajo de fuerza y estabilidad.',
                status: 'pending'
            });
        } else if (dow === 1) {
            sessions.push({
                date,
                session_idx: idx++,
                title: 'Running suave',
                type: 'running',
                duration_min: 40,
                intensity: 'Z2',
                notes: 'Aeróbico controlado.',
                status: 'pending'
            });
        } else {
            sessions.push({
                date,
                session_idx: idx++,
                title: `Descanso (${dayNames[dow]})`,
                type: 'rest',
                duration_min: 0,
                intensity: 'rest',
                notes: 'Recuperación.',
                status: 'pending'
            });
        }
    }

    return {
        plan_name: 'Plan Base 14 días (fallback estable)',
        start_date: startDate,
        acwr_at_generation: acwr,
        sessions,
        coach_rationale: 'Plan generado por fallback determinístico para asegurar consistencia operativa.'
    };
}

// ─────────────────────────────────────────
// GENERAR PLAN
// ─────────────────────────────────────────

export async function generatePlan(userId: string, startDate: string): Promise<any> {
    // Defensive: nunca generar ciclos en el pasado. Si llega un startDate viejo (frontend/UTC/cache),
    // forzamos a "hoy" en formato YYYY-MM-DD.
    const todayStr = new Date().toISOString().split('T')[0];
    if (typeof startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        startDate = todayStr;
    } else if (startDate < todayStr) {
        startDate = todayStr;
    }

    // Garantizar unicidad: si existe un plan activo previo, lo cerramos antes de crear uno nuevo.
    // Esto evita que el dashboard muestre un "active" viejo por ordenamiento/limit.
    try {
        const activeSnap = await db.collection('users').doc(userId)
            .collection('plans')
            .where('status', '==', 'active')
            .limit(10)
            .get();
        if (!activeSnap.empty) {
            const batch = db.batch();
            activeSnap.docs.forEach((d: any) => {
                batch.update(d.ref, {
                    status: 'completed',
                    updatedAt: FieldValue.serverTimestamp(),
                    updated_at: FieldValue.serverTimestamp(),
                    completed_at: FieldValue.serverTimestamp(),
                });
            });
            await batch.commit();
        }
    } catch (e) {
        console.warn('[generatePlan] No se pudo cerrar plan activo previo:', e);
    }

    const [activities, health, userDoc, painSnap] = await Promise.all([
        getRecentActivitiesForPlan(userId, 30),
        getRecentHealthForPlan(userId, 14),
        db.collection('users').doc(userId).get(),
        db.collection('users').doc(userId).collection('pain_logs')
            .orderBy('created_at', 'desc').limit(10).get()
            .catch(() => db.collection('users').doc(userId).collection('pain_logs').limit(10).get())
    ]);
    const userProfile = userDoc.exists ? userDoc.data() : {};
    const painLogs = painSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const acwr = calcACWR(activities);
    const acwrByType = calcACWRByType(activities);
    const latestHealth = health[0] || {};

    // Generar calendario de 14 días con día de semana para que Gemini sepa qué fechas son sábado/domingo
    const calendarLines: string[] = [];
    const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    for (let i = 0; i < 14; i++) {
        const d = new Date(startDate + 'T12:00:00');
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = DAY_NAMES[d.getDay()];
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        calendarLines.push(`  ${dateStr} (${dayName})${isWeekend ? ' ← WEEKEND' : ''}`);
    }
    const calendarContext = calendarLines.join('\n');

    const activitiesSummary = activities.slice(0, 10).map(a => {
        const date = getActivityDate(a);
        const avgHR = getAvgHR(a);
        const hrStr = avgHR != null ? ` | FC ${avgHR}bpm` : '';
        return `- ${date}: ${getActivityType(a)} | ${Number(a.distance_km || 0).toFixed(1)}km | ${Number(a.duration_min || 0).toFixed(0)}min${hrStr} | RPE ${a.rpe || '-'}`;
    }).join('\n');

    const hasBetaBlocker = Array.isArray(userProfile?.medicaciones) &&
        (userProfile.medicaciones as string[]).some((m: string) =>
            /atenolol|metoprolol|bisoprolol|carvedilol|propranolol/i.test(m));

    const hrData = calcMaxHRAndZones(userProfile);
    const maxHR = hrData.mhr;
    const formulaName = hrData.formula;
    const restHR = latestHealth.resting_hr || latestHealth.fc_reposo || 55;
    const weight = latestHealth.weight_kg || latestHealth.peso_kg || null;
    const heightCm = userProfile?.profile?.height_cm || userProfile?.altura_cm || 176;
    const bmi = weight ? +(weight / ((heightCm / 100) ** 2)).toFixed(1) : null;

    const z1Top  = Math.round((maxHR - restHR) * 0.60 + restHR);
    const z2Top  = Math.round((maxHR - restHR) * 0.70 + restHR);
    const z3Top  = Math.round((maxHR - restHR) * 0.80 + restHR);
    const z4Top  = Math.round((maxHR - restHR) * 0.90 + restHR);

    const prompt = `Eres un coach deportivo experto en periodización del entrenamiento para triatletas y corredores.
 
 PERFIL DEL ATLETA (Gonzalo, 49 años):
 - Deportes: tenis, trail running, ciclismo, entrenamiento de fuerza
 - Medicación: ${hasBetaBlocker ? 'Atenolol 50mg (betabloqueante) → FCmax ajustada por medicación, NO usar fórmula 220-edad sin ajuste' : 'Sin beta-bloqueantes'}
 - FC máxima ajustada: ${maxHR} bpm (Fórmula: ${formulaName})
 - Zonas de FC por fórmula de Brawner (FCmax=${maxHR}, FCreposo actual=${restHR} bpm):
   Z1 (recuperación): < ${z1Top} bpm
   Z2 (aeróbico):     ${z1Top}–${z2Top} bpm
   Z3 (umbral):       ${z2Top}–${z3Top} bpm
   Z4 (VO2max):       ${z3Top}–${z4Top} bpm
   Z5 (sprint):       > ${z4Top} bpm
 - Composición Corporal: Peso ${weight}kg | IMC: ${bmi || 'N/A'} (Altura: ${heightCm}cm)
- Condiciones físicas: pronador severo, pie plano, dolor patelofemoral rodilla derecha → evitar impacto repetitivo en Z4/Z5 en running
- Objetivo: rendimiento sostenible sin lesiones

CARGA DE ENTRENAMIENTO (ACWR):
- Global: ratio=${acwrByType.global.ratio} (${acwrStatus(acwrByType.global.ratio)}) | agudo=${acwrByType.global.acute} UA | crónico=${acwrByType.global.chronic} UA
- Alto impacto (running/tenis): ratio=${acwrByType.impact.ratio} (${acwrStatus(acwrByType.impact.ratio)}) | agudo=${acwrByType.impact.acute} UA | crónico=${acwrByType.impact.chronic} UA
- Bajo impacto (ciclismo/natación): ratio=${acwrByType.lowImpact.ratio} (${acwrStatus(acwrByType.lowImpact.ratio)}) | agudo=${acwrByType.lowImpact.acute} UA | crónico=${acwrByType.lowImpact.chronic} UA
${painLogs.length > 0 ? `
REGISTRO DE DOLOR (últimos registros):
${painLogs.map((p: any) => {
    const fecha = p.date || p.created_at?.toDate?.()?.toISOString?.()?.slice(0, 10) || 'N/A';
    return `- ${fecha}: ${p.location || p.zona || 'zona N/A'} — nivel ${p.intensity ?? p.nivel ?? '?'}/10 — fuente: ${p.source || p.fuente || 'chat'}`;
}).join('\n')}` : ''}

DATOS ACTUALES:
- ACWR actual: ${acwr} (${acwrStatus(acwr)})
- HRV hoy: ${latestHealth.hrv_value || latestHealth.hrv || latestHealth.hrv_ms || 'N/A'} ms | HRV semanal promedio: ${latestHealth.hrv_weekly_avg || 'N/A'} ms | Estado HRV: ${latestHealth.hrv_status || 'N/A'}
- FC reposo: ${latestHealth.resting_hr || latestHealth.fc_reposo || 'N/A'} bpm
- Sueño: ${latestHealth.sleep_hours || latestHealth.sueno_horas || 'N/A'} horas (profundo: ${latestHealth.sleep_deep_hours || 'N/A'}h, REM: ${latestHealth.sleep_rem_hours || 'N/A'}h) | Score: ${latestHealth.sleep_score || 'N/A'}/100
- Body Battery: máx ${latestHealth.body_battery_max || 'N/A'} / mín ${latestHealth.body_battery_min || 'N/A'}
- Estrés promedio: ${latestHealth.stress_avg || 'N/A'} | Estrés máx: ${latestHealth.stress_max || 'N/A'}
- Readiness: ${latestHealth.readiness_score || 'N/A'}/100
- Peso: ${latestHealth.weight_kg || latestHealth.peso_kg || 'N/A'} kg

CALENDARIO DE LOS PRÓXIMOS 14 DÍAS (usa estas fechas exactas, respeta el día de semana):
${calendarContext}

ACTIVIDADES RECIENTES (últimas 10):
${activitiesSummary || '- Sin actividades recientes registradas'}

DISPONIBILIDAD Y ESTRUCTURA SEMANAL (REGLAS FIJAS — NO NEGOCIABLES):
- SÁBADO: día de mayor disponibilidad → sesión principal larga (90-120 min). SIEMPRE ciclismo el sábado.
- DOMINGO: sesión secundaria de ciclismo (60-90 min, menor intensidad que el sábado).
- CICLISMO: ÚNICAMENTE los sábados y domingos. JAMÁS en días de semana.
- DÍAS DE SEMANA (lunes a viernes): running, tenis, fuerza o descanso. NUNCA ciclismo.
- NO puede haber sesiones de entrenamiento en días consecutivos (lunes-martes, martes-miércoles, etc.). Siempre un día de descanso o recuperación activa entre sesiones intensas.
- Máximo 4-5 sesiones de entrenamiento activo por semana (sin contar descansos).
- Al menos 2 días de descanso completo o recuperación activa por semana.

PERIODIZACIÓN PARA DESARROLLO MUSCULAR:
- Fuerza: 2 sesiones semanales con al menos 48h de recuperación entre ellas (ej: martes y jueves, o lunes y jueves).
- Progresión: semana 1 = base/volumen (series de 12-15 reps), semana 2 = intensificación (series de 8-10 reps con más peso).
- Ejercicios clave en fuerza: Spanish Squat, Hip Thrust, RDL, Press, Remo — especificar series x reps en la descripción.
- Running: máximo 2 sesiones semanales en días de semana. Nunca el día anterior a fuerza intensa.
- Tenis: 1 sesión semanal en día de semana, considerarlo como trabajo aeróbico + agilidad.

INSTRUCCIONES DE CALIDAD:
1. Si ACWR > 1.3: semana de asimilación (reducir volumen 20-30%, especialmente ciclismo del domingo)
2. Si HRV < 30ms o FC reposo > 65: reemplazar sesión intensa por recuperación activa
3. Plan para 2 semanas desde ${startDate} — respetar TODOS los días del rango, incluir descansos con fecha
4. Especifica zona de intensidad con los valores de FC calculados arriba (Z1-Z5)
5. En sesiones de fuerza: especificar ejercicios, series y reps exactas
6. En sesiones de ciclismo del sábado: sesión larga Z2-Z3, puede incluir segmento Z3 al final
7. En sesiones de ciclismo del domingo: Z1-Z2 regenerativo, sin superar Z2
8. NO superar Z3 en running más de 2 veces por semana (rodilla + Atenolol)

DEVUELVE ÚNICAMENTE este JSON (sin markdown, sin texto adicional).
OBLIGATORIO: "sessions" debe incluir EXACTAMENTE 14 elementos, uno por cada día consecutivo desde "start_date" (incluye descansos como type="rest").
IMPORTANTE: mantén los textos MUY cortos para evitar truncado (especialmente "notes" y "coach_rationale").
{
  "plan_name": "nombre descriptivo del plan",
  "start_date": "${startDate}",
  "acwr_at_generation": ${acwr},
  "sessions": [
    {
      "date": "YYYY-MM-DD",
      "session_idx": 1,
      "title": "título corto (<= 60 chars)",
      "type": "running|cycling|strength|tennis|rest|recovery",
      "duration_min": 60,
      "intensity": "Z1|Z2|Z3|Z4|Z5|mixed|rest",
      "notes": "una sola línea (<= 140 chars)",
      "status": "pending"
    }
  ],
  "coach_rationale": "2 oraciones cortas (<= 240 chars total)"
}`;

    // Limitar llamadas y nunca romper el endpoint: fallback determinístico si el LLM falla.
    let planContent: any;
    let generationMode: 'llm' | 'fallback' = 'llm';
    let validationReason = '';
    try {
        planContent = await callGeminiJson(prompt, { allowTextFallback: false });
        const v = isValidPlanSessions(planContent?.sessions, startDate);
        if (!v.ok) {
            validationReason = `initial_invalid:${v.reason || 'unknown'}`;
            console.warn(`[generatePlan] Plan incompleto (${v.reason}). Intentando repair a 14 días.`);
            planContent = await repairPlanToFullCalendar(planContent, startDate);
            const v2 = isValidPlanSessions(planContent?.sessions, startDate);
            if (!v2.ok) {
                validationReason = `repair_invalid:${v2.reason || 'unknown'}`;
                planContent = await repairPlanForceSchema(planContent, startDate, v2.reason || 'unknown');
                const v3 = isValidPlanSessions(planContent?.sessions, startDate);
                if (!v3.ok) throw new Error(`Plan inválido tras repair: ${v3.reason || 'unknown'}`);
            }
        }
    } catch (e) {
        console.warn('[generatePlan] Fallback determinístico por error de LLM:', e);
        generationMode = 'fallback';
        validationReason = (e as any)?.message || 'llm_error';
        planContent = buildDeterministicPlan(startDate, acwr);
    }

    // Guardar en Firestore — sessions en raíz Y en content para compatibilidad
    const planRef = db.collection('users').doc(userId).collection('plans').doc();
    const planData = {
        id: planRef.id,
        status: 'active',
        content: JSON.stringify(planContent),
        // Campos en raíz para que PlansView los lea directamente
        plan_name: planContent.plan_name || 'Plan de Entrenamiento',
        sessions: planContent.sessions || [],
        coach_rationale: planContent.coach_rationale || '',
        start_date: planContent.start_date || startDate,
        created_at: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        acwr_at_generation: acwr,
        generation_mode: generationMode,
        validation_reason: validationReason || null,
        generated_by: 'cloud-function-v2'
    };

    await planRef.set(planData);

    // HITL ítem #18: crear acción de aprobación automáticamente después de generar el plan
    try {
        await createHitlAction(
            userId,
            'aprobar_plan',
            `El coach generó un nuevo plan "${planContent.plan_name || 'Plan de Entrenamiento'}" desde ${startDate}. ¿Aprobarlo?`,
            { planId: planRef.id, startDate, acwr, plan_name: planContent.plan_name || '' }
        );
    } catch (hitlErr) {
        // No bloquear si HITL falla — el plan ya fue guardado
        console.warn('[generatePlan] No se pudo crear acción HITL:', hitlErr);
    }

    return { planId: planRef.id, content: planContent, acwr };
}

// ─────────────────────────────────────────
// MODIFICAR PLAN
// ─────────────────────────────────────────

export async function modifyPlan(
    userId: string,
    planId: string,
    instruction: string,
    sessionIdx?: number
): Promise<any> {
    const planRef = db.collection('users').doc(userId).collection('plans').doc(planId);
    const planDoc = await planRef.get();

    if (!planDoc.exists) throw new Error(`Plan ${planId} no encontrado`);

    const planData = planDoc.data() as any;
    // Formato normalizado: sessions en raíz. content como fallback para planes legacy sin raíz.
    const rootSessions = Array.isArray(planData.sessions) ? planData.sessions : null;
    const content = rootSessions
        ? { ...planData, sessions: rootSessions }
        : (typeof planData.content === 'string' ? JSON.parse(planData.content) : (planData.content || {}));

    const sessionInfo = sessionIdx !== undefined
        ? `Sesión específica (session_idx: ${sessionIdx}): ${JSON.stringify(content.sessions?.find((s: any) => s.session_idx === sessionIdx) || 'no encontrada')}`
        : 'Aplica al plan completo';

    const prompt = `Eres un coach deportivo. Debes modificar el siguiente plan de entrenamiento.

INSTRUCCIÓN DEL ATLETA: "${instruction}"

SESIÓN A MODIFICAR: ${sessionInfo}

PLAN COMPLETO ACTUAL:
${JSON.stringify(content, null, 2)}

Aplica la modificación solicitada y devuelve el plan completo actualizado.
DEVUELVE ÚNICAMENTE el JSON del plan actualizado (misma estructura, sin markdown):`;

    const rawResponse = await callGemini(prompt);
    const updatedContent = await extractJSONWithRepair(rawResponse, 'modifyPlan');

    await planRef.update({
        content: JSON.stringify(updatedContent),
        sessions: updatedContent.sessions || [],
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        last_modification: instruction
    });

    return { planId, content: updatedContent };
}

// ─────────────────────────────────────────
// EVALUAR / MARCAR SESIÓN COMPLETADA
// ─────────────────────────────────────────

export async function evaluateSession(
    userId: string,
    planId: string,
    sessionIdx: number,
    completionData?: { rpe?: number; duration_min?: number; notes?: string }
): Promise<any> {
    const planRef = db.collection('users').doc(userId).collection('plans').doc(planId);
    const planDoc = await planRef.get();

    if (!planDoc.exists) throw new Error(`Plan ${planId} no encontrado`);

    const planData = planDoc.data() as any;
    // Formato normalizado: sessions en raíz. content como fallback para planes legacy.
    const rootSessions = Array.isArray(planData.sessions) ? planData.sessions : null;
    const content = rootSessions
        ? { ...planData, sessions: rootSessions }
        : (typeof planData.content === 'string' ? JSON.parse(planData.content) : (planData.content || {}));

    // Marcar sesión como completada
    // BUG FIX: usar == en lugar de === para manejar session_idx guardado como string o number
    const sessions = (content.sessions || []).map((s: any) => {
        if (String(s.session_idx) === String(sessionIdx)) {
            return {
                ...s,
                completed: true,
                completed_at: new Date().toISOString(),
                actual_rpe: completionData?.rpe ?? s.actual_rpe,
                actual_duration_min: completionData?.duration_min ?? s.actual_duration_min,
                completion_notes: completionData?.notes ?? ''
            };
        }
        return s;
    });

    const updatedContent = { ...content, sessions };

    // Verificar si todas las sesiones están completadas
    const totalSessions = sessions.filter((s: any) => s.type !== 'rest').length;
    const completedSessions = sessions.filter((s: any) => s.completed && s.type !== 'rest').length;
    const allDone = completedSessions >= totalSessions;

    await planRef.update({
        content: JSON.stringify(updatedContent),
        sessions: sessions,
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        ...(allDone ? { status: 'completed' } : {})
    });

    return {
        planId,
        sessionIdx,
        completed: true,
        allPlanCompleted: allDone,
        progress: `${completedSessions}/${totalSessions} sesiones completadas`
    };
}

// ─────────────────────────────────────────
// ANÁLISIS DEL COACH
// ─────────────────────────────────────────

// Helper: extrae el valor de FC de una actividad manejando los dos esquemas de nombre
function getAvgHR(a: any): number | null {
    const v = a.avg_heart_rate ?? a.avg_hr ?? a.averageHR ?? a.fc_media ?? null;
    return v != null ? Math.round(Number(v)) : null;
}
function getMaxHR(a: any): number | null {
    const v = a.max_heart_rate ?? a.max_hr ?? a.maxHR ?? a.fc_maxima ?? null;
    return v != null ? Math.round(Number(v)) : null;
}
function getActivityDate(a: any): string {
    if (a.date) return a.date;
    if (a.start_time) return a.start_time.slice(0, 10);
    if (a.timestamp?.toDate) return a.timestamp.toDate().toISOString().slice(0, 10);
    return 'N/A';
}
function getActivityType(a: any): string {
    return a.activity_type ?? a.type ?? a.nombre ?? 'actividad';
}

// Campos mínimos requeridos en el JSON del coach
const COACH_ANALYSIS_REQUIRED_FIELDS = [
    'estado_forma',
    'resumen',
    'recomendacion_hoy',
    'proxima_semana',
    'riesgo_lesion',
    'recuperacion',
    'metricas_clave',
    'generated_at',
];

function validateCoachAnalysis(analysis: any): void {
    const missing = COACH_ANALYSIS_REQUIRED_FIELDS.filter(f => analysis[f] == null);
    if (missing.length > 0) {
        throw new Error(`[CoachAnalysis] Campos críticos faltantes en respuesta del LLM: ${missing.join(', ')}`);
    }
    // Validar subobjeto recomendacion_hoy (ítem 9)
    const hoy = analysis.recomendacion_hoy;
    if (typeof hoy !== 'object' || hoy === null) {
        throw new Error('[CoachAnalysis] recomendacion_hoy debe ser un objeto, no un string');
    }
    if (!hoy.tipo_sesion || hoy.duracion_min == null) {
        throw new Error('[CoachAnalysis] recomendacion_hoy.tipo_sesion y duracion_min son obligatorios');
    }
    // Validar subobjeto riesgo_lesion (ítem 7)
    const rl = analysis.riesgo_lesion;
    if (typeof rl !== 'object' || rl === null || !rl.nivel || !rl.motivo) {
        throw new Error('[CoachAnalysis] riesgo_lesion debe tener nivel y motivo');
    }
    // Validar subobjeto recuperacion (ítem 7)
    const rec = analysis.recuperacion;
    if (typeof rec !== 'object' || rec === null || !rec.calidad || !rec.interpretacion) {
        throw new Error('[CoachAnalysis] recuperacion debe tener calidad e interpretacion');
    }
}

export async function generateCoachAnalysis(userId: string, force = false): Promise<any> {
    // ── Caching (ítem 11): saltar regeneración si el análisis es reciente y no hay actividades nuevas ──
    const log = console;
    try {
        const userSnap = await db.collection('users').doc(userId).get();
        const userData = userSnap.exists ? userSnap.data() as any : {};
        const lastGenerated: Date | null = userData?.coachAnalysisUpdatedAt?.toDate?.() ?? null;
        if (!force && lastGenerated) {
            const ageHours = (Date.now() - lastGenerated.getTime()) / 3600000;
            if (ageHours < 3) {
                const newActivities = await db.collection('users').doc(userId)
                    .collection('activities')
                    .where('timestamp', '>', lastGenerated)
                    .limit(1)
                    .get()
                    .catch(() => null);
                if (newActivities && newActivities.empty) {
                    log.info(`[CoachAnalysis] Cache válido (${ageHours.toFixed(1)}h). Saltando regeneración.`);
                    return userData.coachAnalysis ?? null;
                }
            }
        }
    } catch (cacheErr) {
        // Error en la comprobación de caché no debe bloquear la generación
        console.warn('[CoachAnalysis] Error comprobando caché:', cacheErr);
    }

    const [activities, health, weightData] = await Promise.all([
        getRecentActivitiesForPlan(userId, 30),
        getRecentHealthForPlan(userId, 7),
        getRecentWeightData(userId, 10)
    ]);

    const activePlan = await getActivePlanFromFirestore(userId);
    const acwr = calcACWR(activities);
    const acwrByType = calcACWRByType(activities);
    const latestHealth = health[0] || {};

    // ── FC de reposo: campo correcto del esquema Garmin ──────────────────
    const restingHR = latestHealth.resting_hr ?? latestHealth.fc_reposo ?? 55;

    // ── Tendencia HRV (últimos 7 días) ────────────────────────────────────
    const hrvValues = health
        .map((h: any) => Number(h.hrv_value ?? h.hrv ?? h.hrv_ms ?? 0))
        .filter((v: number) => v > 0);
    const hrvTrend = hrvValues.length >= 2
        ? (hrvValues[0] > hrvValues[hrvValues.length - 1] ? 'mejorando' : 'bajando')
        : 'sin datos suficientes';

    // ── Carga semanal usando campo correcto de FC ─────────────────────────
    const weeklyActivities = activities.filter((a: any) => {
        const t = a.timestamp?.toMillis?.() || new Date(getActivityDate(a)).getTime();
        return Date.now() - t <= 7 * 86400000;
    });
    const weeklyLoad = weeklyActivities.reduce((sum: number, a: any) => {
        const durationH = (Number(a.duration_min) || 30) / 60;
        const hr = getAvgHR(a) ?? 130;
        const intensity = hr / 150;
        return sum + durationH * intensity * 100;
    }, 0);

    const loadByType: Record<string, number> = {};
    weeklyActivities.forEach((a: any) => {
        const type = getActivityType(a).toLowerCase();
        const key = type.includes('run') || type.includes('trail') ? 'running'
            : type.includes('cycl') || type.includes('bike') || type.includes('bici') ? 'ciclismo'
            : type.includes('strength') || type.includes('fuerza') ? 'fuerza'
            : type.includes('tenis') || type.includes('tennis') ? 'tenis' : 'otros';
        const durationH = (Number(a.duration_min) || 30) / 60;
        const intensity = (getAvgHR(a) ?? 130) / 150;
        loadByType[key] = (loadByType[key] || 0) + durationH * intensity * 100;
    });

    // ── Plan activo ───────────────────────────────────────────────────────
    const planSummary = activePlan
        ? `Plan activo: "${activePlan.id}" — ${(() => {
            try {
                // Formato normalizado: sessions en raíz
                const sessions = Array.isArray(activePlan.sessions)
                    ? activePlan.sessions
                    : (() => {
                        const c = typeof activePlan.content === 'string'
                            ? JSON.parse(activePlan.content)
                            : (activePlan.content || {});
                        return c.sessions || [];
                    })();
                const done = sessions.filter((s: any) => s.completed).length;
                const total = sessions.filter((s: any) => s.type !== 'rest').length;
                return `${done}/${total} sesiones completadas`;
            } catch { return 'datos del plan no disponibles'; }
        })()}`
        : 'Sin plan activo';

    // ── ÚLTIMA ACTIVIDAD — extracción explícita con todos los campos ──────
    // Ítem #14: clasificar antes de pasar al prompt del coach
    const lastAct = activities[0] ? classifyActivity(activities[0]) : null;
    const lastActBlock = lastAct ? `
ÚLTIMA ACTIVIDAD REGISTRADA (analizar en detalle):
  Fecha:        ${getActivityDate(lastAct)}
  Tipo:         ${getActivityType(lastAct)}
  Clasificación: ${lastAct.tipo} (${lastAct.tipo === 'carrera' ? 'evento nominal con nombre' : 'entrenamiento estándar'})
  Distancia:    ${lastAct.distance_km != null ? Number(lastAct.distance_km).toFixed(2) + ' km' : 'N/A'}
  Duración:     ${lastAct.duration_min != null ? Math.round(lastAct.duration_min) + ' min' : 'N/A'}
  FC media:     ${getAvgHR(lastAct) != null ? getAvgHR(lastAct) + ' bpm' : 'N/A'}
  FC máxima:    ${getMaxHR(lastAct) != null ? getMaxHR(lastAct) + ' bpm' : 'N/A'}
  Cadencia:     ${lastAct.cadence_avg ?? lastAct.cadence ?? 'N/A'}
  Desnivel:     ${lastAct.elevation_gain != null ? '+' + lastAct.elevation_gain + 'm' : 'N/A'}
  Calorías:     ${lastAct.calories ?? 'N/A'}
  RPE:          ${lastAct.rpe ?? 'N/A'}/10
  Velocidad:    ${lastAct.avg_speed_kmh != null ? lastAct.avg_speed_kmh + ' km/h' : 'N/A'}
  Notas:        ${lastAct.notes || lastAct.name || 'sin notas'}` : '\nÚLTIMA ACTIVIDAD: Sin actividades registradas';

    // ── ÚLTIMAS 3 ACTIVIDADES EN DETALLE ─────────────────────────────────
    const top3Acts = activities.slice(0, 3);
    const detailedActivitiesBlock = top3Acts.length > 0
        ? top3Acts.map((a: any, i: number) => {
            const avgHR = getAvgHR(a);
            const maxHR = getMaxHR(a);
            const dist = a.distance_km != null ? Number(a.distance_km).toFixed(2) + ' km' : 'N/A';
            const dur = a.duration_min != null ? Math.round(a.duration_min) + ' min' : 'N/A';
            const hrStr = avgHR != null ? `FC ${avgHR}/${maxHR ?? '?'} bpm` : 'sin FC';
            const cad = a.cadence_avg ?? a.cadence ?? null;
            const elev = a.elevation_gain != null ? `+${a.elevation_gain}m desnivel` : '';
            const pace = (a.avg_speed_kmh != null && Number(a.avg_speed_kmh) > 0)
                ? `${a.avg_speed_kmh} km/h` : '';
            return `  [${i + 1}] ${getActivityDate(a)} — ${getActivityType(a)}
      Distancia: ${dist} | Duración: ${dur} | ${hrStr}
      Cadencia: ${cad ?? 'N/A'} | ${elev || 'sin desnivel'} | ${pace || 'sin velocidad'}
      RPE: ${a.rpe ?? 'N/A'} | Carga: ${a.training_load ?? a.aerobicTrainingEffect ?? 'N/A'}`;
        }).join('\n')
        : '  Sin actividades registradas';

    // ── PESO — datos recientes de Withings + daily_health ─────────────────
    const latestWeight = weightData[0] || null;
    const weightBlock = latestWeight
        ? `Último registro: ${latestWeight.date} — ${latestWeight.weight_kg} kg (fuente: ${latestWeight.source})${latestWeight.fat_percent ? ` | Grasa: ${latestWeight.fat_percent}%` : ''}${latestWeight.muscle_percent ? ` | Músculo: ${latestWeight.muscle_percent}%` : ''}`
        : 'Sin datos de peso registrados';
    const weightHistory = weightData.slice(0, 5).map((w: any) =>
        `  ${w.date}: ${w.weight_kg} kg${w.fat_percent ? ` (grasa ${w.fat_percent}%)` : ''}`
    ).join('\n') || '  Sin historial';

    // ── Actividades últimas 2 semanas (resumen de líneas) ─────────────────
    const recentActivitiesText = activities.slice(0, 14).map((a: any) => {
        const avgHR = getAvgHR(a);
        const dist = a.distance_km ? `${Number(a.distance_km).toFixed(1)}km` : '';
        const dur = a.duration_min ? `${Math.round(a.duration_min)}min` : '';
        const hr = avgHR != null ? `FC ${avgHR}bpm` : '';
        const rpe = a.rpe ? `RPE ${a.rpe}` : '';
        return `- ${getActivityDate(a)}: ${getActivityType(a)} ${[dist, dur, hr, rpe].filter(Boolean).join(' | ')}`;
    }).join('\n');

    // ── Zonas de FC Dinámicas (SOTA 2026) ────────────────────────────────
    const userDoc = await db.collection('users').doc(userId).get();
    const userProfile = userDoc.exists ? userDoc.data() : {};
    const hrData = calcMaxHRAndZones(userProfile);
    const maxHR = hrData.mhr;
    const formulaName = hrData.formula;
    
    const hrR = Number(restingHR);
    const z1 = Math.round((maxHR - hrR) * 0.6 + hrR);
    const z2lo = z1;
    const z2hi = Math.round((maxHR - hrR) * 0.7 + hrR);
    const z3lo = z2hi;
    const z3hi = Math.round((maxHR - hrR) * 0.8 + hrR);
    const z4lo = z3hi;
    const z4hi = Math.round((maxHR - hrR) * 0.9 + hrR);

    // ── Composición Corporal (IMC) ───────────────────────────────────────
    const weight = latestWeight?.weight_kg || null;
    const heightCm = userProfile?.profile?.height_cm || userProfile?.altura_cm || 176;
    const bmi = weight ? +(weight / ((heightCm / 100) ** 2)).toFixed(1) : null;

    const prompt = `Eres el coach personal de Gonzalo (49 años, deportista multidisciplina). Analiza sus datos biométricos y de entrenamiento y genera un análisis completo y personalizado.

PERFIL MÉDICO OBLIGATORIO:
- Medicación: ${formulaName.includes('Atenolol') ? 'Atenolol 50mg (betabloqueante) → FC máxima ajustada' : 'Sin medicación betabloqueante'}
- FC máxima real calculada: ${maxHR} bpm (Fórmula: ${formulaName})
- Zonas de FC por Brawner (FCmax=${maxHR}, FCreposo=${hrR} bpm):
  Z1 (recuperación): < ${z1} bpm
  Z2 (aeróbico base): ${z2lo}–${z2hi} bpm
  Z3 (umbral): ${z3lo}–${z3hi} bpm
  Z4 (VO2max): ${z4lo}–${z4hi} bpm
- Composición Corporal: Peso actual ${weight}kg | IMC ${bmi || 'N/A'} (Altura: ${heightCm}cm)
- Dolor patelofemoral rodilla derecha — alertar si hay múltiples sesiones de impacto repetitivo en Z3+
- Pronador severo + pie plano — evaluar carga de running con precaución adicional
${lastActBlock}

ÚLTIMAS 3 ACTIVIDADES EN DETALLE:
${detailedActivitiesBlock}

HISTORIAL DE ACTIVIDADES (últimas 2 semanas):
${recentActivitiesText || '- Sin actividades registradas'}

DATOS DE PESO Y COMPOSICIÓN CORPORAL:
${weightBlock}
Historial de pesos recientes:
${weightHistory}

DATOS BIOMÉTRICOS ACTUALES (hoy: ${health[0]?.date || latestHealth.id || 'N/A'}):
CARGA DE ENTRENAMIENTO (ACWR):
- Global: ratio=${acwrByType.global.ratio} (${acwrStatus(acwrByType.global.ratio)}) | agudo=${acwrByType.global.acute} UA | crónico=${acwrByType.global.chronic} UA
- Alto impacto (running/tenis): ratio=${acwrByType.impact.ratio} (${acwrStatus(acwrByType.impact.ratio)}) | agudo=${acwrByType.impact.acute} UA | crónico=${acwrByType.impact.chronic} UA
- Bajo impacto (ciclismo/natación): ratio=${acwrByType.lowImpact.ratio} (${acwrStatus(acwrByType.lowImpact.ratio)}) | agudo=${acwrByType.lowImpact.acute} UA | crónico=${acwrByType.lowImpact.chronic} UA

- ACWR: ${acwr} (${acwrStatus(acwr)})
- HRV: último valor ${latestHealth.hrv_value ?? latestHealth.hrv ?? latestHealth.hrv_ms ?? 'N/A'} ms | Promedio semanal: ${latestHealth.hrv_weekly_avg ?? 'N/A'} ms | Tendencia 7d: ${hrvTrend} | Estado Garmin: ${latestHealth.hrv_status ?? 'N/A'}
- FC reposo: ${restingHR} bpm
- Sueño: ${latestHealth.sleep_hours ?? latestHealth.sueno_horas ?? 'N/A'}h total (profundo: ${latestHealth.sleep_deep_hours ?? 'N/A'}h, REM: ${latestHealth.sleep_rem_hours ?? 'N/A'}h) | Score: ${latestHealth.sleep_score ?? latestHealth.sleep_quality ?? 'N/A'}/100
- Body Battery: máx ${latestHealth.body_battery_max ?? 'N/A'} / mín ${latestHealth.body_battery_min ?? 'N/A'}
- Estrés promedio: ${latestHealth.stress_avg ?? 'N/A'} | Estrés máx: ${latestHealth.stress_max ?? 'N/A'} (>75 = alto)
- Carga semanal total: ${weeklyLoad.toFixed(0)} UA | Desglose: running ${(loadByType.running || 0).toFixed(0)}UA, ciclismo ${(loadByType.ciclismo || 0).toFixed(0)}UA, fuerza ${(loadByType.fuerza || 0).toFixed(0)}UA, tenis ${(loadByType.tenis || 0).toFixed(0)}UA
- ${planSummary}

INSTRUCCIONES PARA EL ANÁLISIS:
1. El resumen debe ser sustancial (4-6 oraciones) — integrando HRV, sueño, ACWR, última actividad y carga. CRÍTICO: cada vez que menciones un dato (actividad, peso, sueño, HRV) DEBES incluir la fecha exacta del registro entre paréntesis. Ej: "La última actividad fue un ciclismo de 45min el 19/04/2026" o "HRV de 52ms registrado el 20/04/2026"
2. ultima_actividad_analisis: analiza explícitamente la última sesión — ¿fue bien ejecutada?, ¿la FC fue adecuada para el tipo de sesión?, ¿hay señales de fatiga o sobresfuerzo?, ¿el RPE es coherente con la FC?
3. tendencia_peso: analiza el peso actual y su evolución reciente — ¿hay cambios significativos?, ¿es coherente con el nivel de entrenamiento?, ¿comentario sobre composición corporal si hay datos de grasa/músculo?
4. recomendacion_hoy: objeto con campos OBLIGATORIOS — tipo_sesion, duracion_min, intensidad, zona_fc (con zona, bpm_min, bpm_max), descripcion, motivo. CRÍTICO: usa las zonas FC calculadas arriba basadas en FCmax=${maxHR} bpm (Atenolol 50mg). JAMÁS uses 220-edad sin ajuste.
5. proxima_semana: objeto con campos OBLIGATORIOS — distribucion (ciclismo, running, fuerza, tenis), enfoque_carga, control_monotonia, prioridad, resumen. Ciclismo SOLO sábado/domingo.
6. riesgo_lesion: objeto con campos OBLIGATORIOS — nivel (bajo|medio|alto), zona, motivo, factores (array), recomendacion. Evalúa rodilla derecha en función de carga de running, intensidad y ACWR.
7. recuperacion: objeto con campos OBLIGATORIOS — calidad (buena|regular|deficiente), body_battery (number|null), sleep_hours (number|null), interpretacion, accion_recomendada (entrenar|recuperar|descanso activo). Integra Body Battery + sueño + FC reposo + estrés.
8. Si hay datos N/A, infiere razonablemente o indica qué métricas están faltando
9. Texto en español, tono profesional pero cercano

DEVUELVE ÚNICAMENTE este JSON (sin markdown, sin texto antes o después):
{
  "estado_forma": "óptimo|bueno|regular|fatigado|sobrecargado",
  "resumen": "4-6 oraciones integrando HRV, sueño, carga, última actividad y tendencia general",
  "tendencia": "mejorando|estable|deteriorando",
  "alerta": null,
  "ultima_actividad_analisis": "análisis específico de la última sesión: ejecución, FC vs zona objetivo, señales de fatiga, coherencia RPE/FC",
  "tendencia_peso": "análisis del peso actual y evolución reciente: cambios, composición corporal si hay datos, coherencia con entrenamiento",
  "recomendacion_hoy": {
    "tipo_sesion": "ej: Ciclismo Z2, Fuerza funcional, Descanso activo",
    "duracion_min": 60,
    "intensidad": "baja|moderada|alta",
    "zona_fc": {
      "zona": "Z1|Z2|Z3|Z4|Z5",
      "bpm_min": ${z2lo},
      "bpm_max": ${z2hi}
    },
    "descripcion": "qué hacer exactamente en la sesión",
    "motivo": "por qué esta sesión hoy basado en los datos actuales"
  },
  "proxima_semana": {
    "distribucion": {
      "ciclismo": "descripción — SOLO sábado/domingo",
      "running": "descripción — días de semana si procede",
      "fuerza": "descripción — 2 sesiones máximo con 48h entre ellas",
      "tenis": "descripción o 'no programado'"
    },
    "enfoque_carga": "progresiva|mantenimiento|descarga",
    "control_monotonia": "observación sobre variedad de estímulos",
    "prioridad": "rendimiento|recuperacion|prevencion_lesion",
    "resumen": "2-3 líneas de orientación general para la semana"
  },
  "carga_por_disciplina": {
    "running": "${(loadByType.running || 0).toFixed(0)} UA esta semana",
    "ciclismo": "${(loadByType.ciclismo || 0).toFixed(0)} UA esta semana",
    "fuerza": "${(loadByType.fuerza || 0).toFixed(0)} UA esta semana",
    "tenis": "${(loadByType.tenis || 0).toFixed(0)} UA esta semana"
  },
  "riesgo_lesion": {
    "nivel": "bajo|medio|alto",
    "zona": "rodilla derecha",
    "motivo": "1-2 oraciones sobre el riesgo específico detectado",
    "factores": ["factor 1 que contribuye al riesgo", "factor 2"],
    "recomendacion": "qué hacer para mitigar el riesgo"
  },
  "recuperacion": {
    "calidad": "buena|regular|deficiente",
    "body_battery": ${latestHealth.body_battery_max ?? 'null'},
    "sleep_hours": ${latestHealth.sleep_hours ?? latestHealth.sueno_horas ?? 'null'},
    "interpretacion": "1-2 oraciones sobre calidad de recuperación integrando Body Battery + sueño + estrés",
    "accion_recomendada": "entrenar|recuperar|descanso activo"
  },
  "metricas_clave": {
    "acwr": ${acwr},
    "carga_semanal": ${weeklyLoad.toFixed(0)},
    "hrv_tendencia": "${hrvTrend}",
    "hrv_ms": ${latestHealth.hrv_value ?? latestHealth.hrv ?? latestHealth.hrv_ms ?? 'null'},
    "fc_reposo": ${restingHR},
    "sleep_score": ${latestHealth.sleep_score ?? 'null'},
    "body_battery_max": ${latestHealth.body_battery_max ?? 'null'},
    "peso_kg": ${latestWeight?.weight_kg ?? 'null'},
    "bmi": ${bmi ?? 'null'}
  },
  "generated_at": "${new Date().toISOString()}"
}`;

    const rawResponse = await callGemini(prompt);

    // ── Validación estricta del JSON antes de persistir (ítem 8) ──────────
    let analysis: any;
    try {
        analysis = await extractJSONWithRepair(rawResponse, 'coachAnalysis');
    } catch (parseErr) {
        console.error('[CoachAnalysis] Error parseando JSON del LLM:', parseErr);
        console.error('[CoachAnalysis] Respuesta raw (primeros 500 chars):', rawResponse.slice(0, 500));
        throw parseErr;
    }

    try {
        validateCoachAnalysis(analysis);
    } catch (validationErr) {
        console.error('[CoachAnalysis] Validación fallida — NO se persiste en Firestore:', validationErr);
        throw validationErr;
    }

    // ── Agregar trazabilidad de versión del prompt (ítem 12) ──────────────
    const analysisToStore = {
        ...analysis,
        prompt_version: COACH_PROMPT_VERSION,
        generated_at: analysis.generated_at ?? new Date().toISOString(),
    };

    // Guardar en el doc principal del usuario
    await db.collection('users').doc(userId).set(
        { coachAnalysis: analysisToStore, coachAnalysisUpdatedAt: FieldValue.serverTimestamp() },
        { merge: true }
    );

    return analysisToStore;
}
