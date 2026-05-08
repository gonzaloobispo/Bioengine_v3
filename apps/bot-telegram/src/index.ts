import { validateConfig, ENV } from './config.js';
import { initDB, storage, db, classifyActivity } from './memory/db.js';
import { generatePlan, modifyPlan, evaluateSession, generateCoachAnalysis, calcMaxHRAndZones } from './services/plans.js';
import { sendNewUserNotification, sendUserApprovalNotification, sendCatalogProposalNotification } from './services/emailNotifications.js';
import { syncGarmin, syncWithings, withingsExchangeCode } from './services/health_sync.js';
import { bot, getBot } from './bot/telegram.js';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';

// GCP Secret Manager — secrets inyectados como env vars en tiempo de ejecución.
// Para agregar un secret: firebase functions:secrets:set SECRET_NAME
const secretTelegramToken = defineSecret('TELEGRAM_BOT_TOKEN');
const secretGeminiKey = defineSecret('GEMINI_API_KEY');
const secretGroqKey = defineSecret('GROQ_API_KEY');
const secretOpenrouterKey = defineSecret('OPENROUTER_API_KEY');
const secretElevenlabsKey = defineSecret('ELEVENLABS_API_KEY');
import { processTurn } from './agent/worker.js';
import { webhookCallback } from 'grammy';
import { InputFile } from 'grammy';
import { sendSplitMessage } from './bot/telegram.js';
import { checkAndSendAlerts } from './bot/alerts.js';
import { getLogger } from './utils/logger.js';
import * as admin from 'firebase-admin';
import { saveVoiceUrl } from './memory/state.js';
import { applyRaceTagsForDate } from './services/race_tagging.js';

let initialized = false;
async function ensureReady() {
    if (!initialized) {
        validateConfig();
        await initDB();
        initialized = true;
    }
}

// Entry point for Firebase Cloud Functions - Telegram Ingestion & Dashboard API


export const opengravity = onRequest({
    invoker: 'public',
    // Generación de planes puede requerir múltiples llamadas a LLM + Firestore.
    timeoutSeconds: 180,
    memory: '1GiB',
    secrets: [secretTelegramToken, secretGeminiKey, secretGroqKey, secretOpenrouterKey, secretElevenlabsKey]
}, async (req, res) => {
    await ensureReady();
    
    // Handle Dashboard-to-Proxy calls for Cloud Function logic
    const rawPath = req.path || '/';
    const path = rawPath.replace(/^\/api-cloud/, '') || '/';

    // Helper: verificar que el usuario tiene status 'active' en Firestore
    // El owner siempre pasa. Se usa en endpoints protegidos.
    async function checkUserActive(userId: string): Promise<boolean> {
        const OWNER_UID = process.env.BIOENGINE_OWNER_UID;
        if (userId === OWNER_UID) return true;
        try {
            const snap = await db.collection('users').doc(userId).get();
            if (!snap.exists) return false;
            const data = snap.data() || {};
            const status = data.status || data.profile?.status;
            return status === 'active';
        } catch {
            return false;
        }
    }

    // Rutas que NO requieren verificación de status activo
    const OPEN_PATHS = ['/auth/token', '/catalog', '/health', '/log/remote'];
    const requiresStatusCheck = rawPath.startsWith('/api-cloud/')
        && !OPEN_PATHS.some(p => path === p || path.startsWith(p));

    // Helper check status with bypass for Admin
    const adminToken = req.headers['x-admin-token'];
    const isAdmin = adminToken === (process.env.BIOENGINE_ADMIN_TOKEN || 'bioengine-local');

    if (requiresStatusCheck && req.headers['x-user-id']) {
        const requestUserId = req.headers['x-user-id'] as string;
        
        // El admin o el owner siempre pasan
        const isOwner = requestUserId === (process.env.BIOENGINE_OWNER_UID);
        
        if (!isAdmin && !isOwner) {
            const isActive = await checkUserActive(requestUserId);
            if (!isActive) {
                res.status(403).json({
                    error: 'account_pending',
                    message: 'Tu cuenta está pendiente de aprobación.'
                });
                return;
            }
        }
    }


    // HITL: listar acciones pendientes de aprobación (requiere admin token)
    if (req.method === 'GET' && path === '/hitl/pending') {
        const hitlAdminToken = req.headers['x-admin-token'];
        if (!hitlAdminToken || hitlAdminToken !== (process.env.BIOENGINE_ADMIN_TOKEN || 'bioengine-local')) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        try {
            const OWNER_UID = process.env.BIOENGINE_OWNER_UID;
            const userId = req.headers['x-user-id'] as string || OWNER_UID;
            const snap = await db.collection('hitl_actions')
                .where('userId', '==', userId)
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();
            const actions = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            res.json(actions);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }
    // HITL: aprobar o rechazar una acción
    if (req.method === 'POST' && path === '/hitl/approve') {
        try {
            const { actionId, decision } = req.body;
            if (!actionId || !decision) {
                res.status(400).json({ error: 'actionId and decision required' });
                return;
            }
            const { FieldValue } = await import('firebase-admin/firestore');
            const actionRef = db.collection('hitl_actions').doc(actionId);
            const actionSnap = await actionRef.get();
            if (!actionSnap.exists) {
                res.status(404).json({ error: 'Action not found' });
                return;
            }
            await actionRef.update({
                status: decision === 'approved' ? 'approved' : 'rejected',
                resolvedAt: FieldValue.serverTimestamp(),
                resolvedBy: req.headers['x-user-id'] || process.env.BIOENGINE_OWNER_UID
            });
            if (decision === 'approved') {
                const action = actionSnap.data()!;
                try {
                    if (action.type === 'plan_generate') {
                        const result = await generatePlan(action.userId, action.payload?.forceNew);
                        await actionRef.update({ status: 'executed', result: JSON.stringify(result).substring(0, 500) });
                    }
                } catch (err: any) {
                    await actionRef.update({ status: 'approved', executionError: err.message });
                }
            }
            res.json({ success: true, actionId, decision });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }
    // HITL: crear una acción pendiente de aprobación (uso interno del sistema)
    if (req.method === 'POST' && path === '/hitl/create') {
        try {
            const adminToken = req.headers['x-admin-token'];
            if (adminToken !== (ENV.BIOENGINE_ADMIN_TOKEN || 'bioengine-local')) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }
            const { userId, type, title, description, payload } = req.body;
            if (!userId || !type || !title) {
                res.status(400).json({ error: 'userId, type, title required' });
                return;
            }
            const { FieldValue } = await import('firebase-admin/firestore');
            const actionRef = await db.collection('hitl_actions').add({
                userId,
                type,
                title,
                description: description || '',
                payload: payload || {},
                status: 'pending',
                createdAt: FieldValue.serverTimestamp()
            });
            res.json({ success: true, actionId: actionRef.id });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }
    // ─── HITL REST v2 — subcollección users/{userId}/hitl_actions (ítem #18) ───

    // GET /api-cloud/hitl → lista acciones del usuario (filtra por estado si se pasa ?estado=pendiente)
    if (req.method === 'GET' && path === '/hitl') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const { getHitlActions } = await import('./memory/db.js');
            const estadoParam = req.query.estado as string | undefined;
            const validEstados = ['pendiente', 'aprobado', 'rechazado'];
            const estado = estadoParam && validEstados.includes(estadoParam) ? estadoParam as any : 'pendiente';
            const actions = await getHitlActions(userId, estado);
            res.json({ actions });
        } catch (e: any) {
            console.error('[HITL GET] Error:', e);
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // POST /api-cloud/hitl → crea nueva acción HITL (body: tipo, descripcion, payload)
    if (req.method === 'POST' && path === '/hitl') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const { tipo, descripcion, payload } = req.body || {};
            const validTipos = ['aprobar_plan', 'confirmar_borrado', 'cambio_parametros'];
            if (!tipo || !validTipos.includes(tipo)) {
                res.status(400).json({ error: `tipo requerido y debe ser uno de: ${validTipos.join(', ')}` });
                return;
            }
            if (!descripcion || typeof descripcion !== 'string') {
                res.status(400).json({ error: 'descripcion requerida (string)' });
                return;
            }
            const { createHitlAction } = await import('./memory/db.js');
            const actionId = await createHitlAction(userId, tipo, descripcion, payload || {});
            res.status(201).json({ success: true, actionId });
        } catch (e: any) {
            console.error('[HITL POST] Error:', e);
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // PUT /api-cloud/hitl/:id → resuelve acción (body: { decision: 'aprobado'|'rechazado' })
    if (req.method === 'PUT' && path.startsWith('/hitl/') && path.split('/').length === 3) {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const actionId = path.split('/')[2];
            const { decision } = req.body || {};
            if (!decision || !['aprobado', 'rechazado'].includes(decision)) {
                res.status(400).json({ error: "decision debe ser 'aprobado' o 'rechazado'" });
                return;
            }
            const { resolveHitlAction } = await import('./memory/db.js');
            await resolveHitlAction(userId, actionId, decision, userId);
            res.json({ success: true, actionId, decision });
        } catch (e: any) {
            console.error('[HITL PUT] Error:', e);
            if (e.message?.includes('no encontrada')) {
                res.status(404).json({ error: e.message });
            } else {
                res.status(500).json({ error: e.message });
            }
        }
        return;
    }

    // Plans: List (GET /api-cloud/plans)
    if (req.method === 'GET' && path === '/plans') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const snap = await db.collection('users').doc(userId).collection('plans')
                .orderBy('updatedAt', 'desc').limit(10)
                .get().catch(() => db.collection('users').doc(userId).collection('plans').limit(10).get());
            const plans = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            res.json({ plans });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Plans: Generate
    if (req.method === 'POST' && path === '/plans/generate') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const startDate = req.body?.start_date || new Date().toISOString().split('T')[0];
            const plan = await generatePlan(userId, startDate);
            res.json({ success: true, planId: plan.planId, content: plan.content, acwr: plan.acwr });
        } catch (e: any) {
            res.status(500).json({ success: false, error: e.message });
        }
        return;
    }
    // Plans: Modify
    if (req.method === 'POST' && path.match(/^\/plans\/[^/]+\/modify$/)) {
        try {
            const planId = path.split('/')[2];
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const instruction = req.body?.instruction || '';
            const sessionIdx = req.body?.session_idx;
            const plan = await modifyPlan(userId, planId, instruction, sessionIdx);
            res.json({ success: true, planId: plan.planId, content: plan.content });
        } catch (e: any) {
            res.status(500).json({ success: false, error: e.message });
        }
        return;
    }
    // Plans: Evaluate session
    if (req.method === 'POST' && path.match(/^\/plans\/[^/]+\/evaluate$/)) {
        try {
            const planId = path.split('/')[2];
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const sessionIdx = req.body?.session_idx ?? 0;
            const completionData = req.body?.completion_data;
            const plan = await evaluateSession(userId, planId, sessionIdx, completionData);
            res.json({ success: true, planId: plan.planId, sessionIdx: plan.sessionIdx, completed: plan.completed, allPlanCompleted: plan.allPlanCompleted, progress: plan.progress });
        } catch (e: any) {
            res.status(500).json({ success: false, error: e.message });
        }
        return;
    }
    // ACWR — Acute:Chronic Workload Ratio (últimas 4 semanas)
    if (path === '/acwr') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const MS_DAY = 86400000;
            const now = Date.now();
            const actSnap = await db.collection('users').doc(userId).collection('activities')
                .orderBy('start_time', 'desc').limit(200).get();

            const activities = actSnap.docs.map((d: any) => d.data());

            const getLoad = (a: any): number => {
                const tl = Number(a.training_load || a.trainingLoad || 0);
                if (tl > 0) {
                    // Si es <= 12, probablemente es Training Effect (0-5) o similar. 
                    // Si es > 12, es casi seguro EPOC (Training Load real).
                    return tl <= 12 ? tl * 20 : tl;
                }
                // Fallback: estimar por duración + HR
                const durationH = (Number(a.duration_min || a.duration) || 30) / 60;
                const hr = Number(a.avg_heart_rate || a.avg_hr) || 130;
                const intensity = Math.max(0.5, hr / 150);
                return durationH * intensity * 100;
            };

            const getDaysAgo = (a: any): number => {
                const ts = a.start_time?.toDate ? a.start_time.toDate().getTime() : new Date(a.start_time || 0).getTime();
                return (now - ts) / MS_DAY;
            };

            // Build daily load for last 28 days
            const dailyLoad: Record<string, number> = {};
            for (let i = 0; i < 28; i++) {
                const d = new Date(now - i * MS_DAY);
                dailyLoad[d.toISOString().split('T')[0]] = 0;
            }
            for (const a of activities) {
                const daysAgo = getDaysAgo(a);
                if (daysAgo > 28) continue;
                const d = new Date(now - daysAgo * MS_DAY);
                const key = d.toISOString().split('T')[0];
                if (key in dailyLoad) dailyLoad[key] += getLoad(a);
            }

            const days = Object.entries(dailyLoad).sort(([a], [b]) => a.localeCompare(b));
            const acute = activities.filter((a: any) => getDaysAgo(a) <= 7).reduce((s: number, a: any) => s + getLoad(a), 0) / 7;
            const chronic = activities.filter((a: any) => getDaysAgo(a) <= 28).reduce((s: number, a: any) => s + getLoad(a), 0) / 28;
            const acwr = chronic > 0 ? +(acute / chronic).toFixed(2) : 1.0;

            let status = 'zona óptima';
            if (acwr < 0.8) status = 'subestimulación';
            else if (acwr > 1.5) status = 'PELIGRO — riesgo de lesión';
            else if (acwr > 1.3) status = 'carga elevada';

            res.json({ acwr, acute: +acute.toFixed(1), chronic: +chronic.toFixed(1), status, dailyLoad: days.map(([date, load]) => ({ date, load: +load.toFixed(1) })) });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // HRV Trend — últimos 30 días
    if (path === '/hrv-trend') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const snap = await db.collection('users').doc(userId).collection('daily_health')
                .orderBy('date', 'desc').limit(30).get();

            const trend = snap.docs.map((d: any) => {
                const data = d.data();
                return {
                    date: data.date || d.id,
                    hrv: data.hrv_value || data.hrv || data.hrv_ms || null,
                    resting_hr: data.resting_hr || data.fc_reposo || null,
                    sleep_score: data.sleep_score || null,
                    body_battery_max: data.body_battery_max || null
                };
            }).filter((d: any) => d.hrv !== null).reverse();

            const values = trend.map((d: any) => d.hrv).filter(Boolean) as number[];
            const avg = values.length ? +(values.reduce((a: number, b: number) => a + b, 0) / values.length).toFixed(1) : null;
            const min = values.length ? Math.min(...values) : null;
            const max = values.length ? Math.max(...values) : null;

            res.json({ trend, avg, min, max, days: trend.length });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Debug: ver últimos docs de biometrics y activities
    if (path === '/debug/data') {
        const userId = req.headers['x-user-id'] as string;
        if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
        const [bioSnap, actSnap] = await Promise.all([
            db.collection('users').doc(userId).collection('biometrics').orderBy('date', 'desc').limit(5).get().catch(() =>
                db.collection('users').doc(userId).collection('biometrics').limit(5).get()
            ),
            db.collection('users').doc(userId).collection('activities').orderBy('start_time', 'desc').limit(3).get().catch(() =>
                db.collection('users').doc(userId).collection('activities').limit(3).get()
            )
        ]);
        res.json({
            biometrics: bioSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
            activities: actSnap.docs.map((d: any) => classifyActivity({ id: d.id, ...d.data() }))
        });
        return;
    }

    // Coach analysis (real, from Firestore + Gemini)
    if (path === '/coach-analysis') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const force = req.query.force === 'true';
            const analysis = await generateCoachAnalysis(userId, force);
            res.json({ analysis });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }
    if (path === '/coach-status' || path === '/chat/status' || path.includes('/coach-')) {
        const activeModel = ENV.GEMINI_API_KEY
            ? 'Gemini 2.5 Flash'
            : ENV.GROQ_API_KEY
                ? 'Groq llama-3.3-70b'
                : 'OpenRouter';
        res.json({
            status: 'active',
            mode: 'auto',
            description: 'BioEngine V3 Coach (v4-unified) activo y analizando.',
            model: activeModel
        });
        return;
    }
    // GET /api-cloud/kpis/training-intelligence
    if (req.method === 'GET' && path === '/kpis/training-intelligence') {
        try {
            const userId = (req.headers['x-user-id'] as string) || process.env.BIOENGINE_OWNER_UID || 'gonzalo-v4';
            const userPath = `users/${userId}`;

            // Leer actividades recientes (últimas 30 para calcular cargas)
            const [activitiesSnap, healthSnap, userSnap] = await Promise.all([
                db.collection(`${userPath}/activities`).orderBy('start_time', 'desc').limit(30).get()
                    .catch(() => db.collection(`${userPath}/activities`).limit(30).get()),
                db.collection(`${userPath}/daily_health`).orderBy('date', 'desc').limit(14).get()
                    .catch(() => db.collection(`${userPath}/daily_health`).limit(14).get()),
                db.collection('users').doc(userId).get()
            ]);

            const activities: any[] = activitiesSnap.docs.map((d: any) => d.data());
            const health: any[] = healthSnap.docs.map((d: any) => d.data());
            const userData = userSnap.exists ? userSnap.data() : {};
            const coachAnalysis = userData?.coachAnalysis || {};

            // --- ACWR / Load Balance ---
            const now = Date.now();
            const ms1d = 86400000;
            const loads7: number[] = [];
            const loads28: number[] = [];
            let aerobicTotal = 0;
            let anaerobicTotal = 0;

            for (const act of activities) {
                const tlRaw = Number(act.trainingLoad || act.training_load || 0);
                // Si es <= 12, probablemente es Training Effect (0-5). Normalizar a EPOC (~ ×20)
                const tl = tlRaw <= 12 ? tlRaw * 20 : tlRaw;
                
                const te = Number(act.aerobicTE || act.aerobic_te || 0);
                const actDate = act.start_time?.toDate?.() || (act.start_time ? new Date(act.start_time) : null);
                if (!actDate) continue;
                const daysAgo = (now - actDate.getTime()) / ms1d;
                if (daysAgo <= 7) loads7.push(tl);
                if (daysAgo <= 28) loads28.push(tl);
                // Classify aerobic vs anaerobic by aerobicTE threshold
                if (te >= 3) { anaerobicTotal += tl; } else { aerobicTotal += tl; }
            }

            const acute = loads7.reduce((s, v) => s + v, 0) / 7;
            const chronic = loads28.length > 0 ? loads28.reduce((s, v) => s + v, 0) / 28 : 1;
            const acwr = chronic > 0 ? acute / chronic : 1.0;
            const lbStatus = acwr < 0.8 ? 'good' : acwr <= 1.3 ? 'balanced' : acwr <= 1.5 ? 'warning' : 'risk';

            const load_balance = {
                ratio: Math.min(acwr, 9.99),
                status: lbStatus,
                aerobic_total: Math.round(aerobicTotal),
                anaerobic_total: Math.round(anaerobicTotal)
            };

            // --- Polarization ---
            let zLow = 0, zMod = 0, zHigh = 0;
            for (const act of activities) {
                const te = Number(act.aerobicTE || act.aerobic_te || 0);
                const dur = Number(act.duration_min || act.durationMinutes || 0);
                if (te < 2) zLow += dur;
                else if (te < 3) zMod += dur;
                else zHigh += dur;
            }
            const zTotal = zLow + zMod + zHigh || 1;
            const polarizationScore = (zLow + zHigh) / zTotal * 100;
            const polStatus = polarizationScore >= 70 ? 'balanced' : polarizationScore >= 50 ? 'good' : 'too_aerobic';
            const polarization = {
                score: polarizationScore,
                model: '80/20',
                status: polStatus,
                z_low_pct: (zLow / zTotal) * 100,
                z_moderate_pct: (zMod / zTotal) * 100,
                z_high_pct: (zHigh / zTotal) * 100
            };

            // --- Recovery Quality ---
            let recoverySum = 0;
            let recoveryCount = 0;
            for (const h of health) {
                const hrv = Number(h.hrv_value || h.hrv || 0);
                const sleep = Number(h.sleep_hours || h.sleepHours || 0);
                const stress = Number(h.stress_level || h.stressLevel || 25);
                if (hrv > 0 || sleep > 0) {
                    let score = 50;
                    score += (hrv - 40) * 0.5;
                    score += (sleep - 6) * 10;
                    score -= (stress - 20) * 0.5;
                    recoverySum += Math.min(100, Math.max(0, score));
                    recoveryCount++;
                }
            }
            const recoveryScore = recoveryCount > 0 ? Math.round(recoverySum / recoveryCount) : 70;
            const recovStatus = recoveryScore >= 80 ? 'excellent' : recoveryScore >= 65 ? 'good' : recoveryScore >= 50 ? 'fair' : 'poor';
            const recovery_quality = { score: recoveryScore, status: recovStatus };

            // --- cardio_status from coachAnalysis ---
            const metricas = coachAnalysis?.metricas_clave || {};
            const cardio_status = {
                hill_score: metricas.hill_score || null,
                endurance_score: metricas.endurance_score || null,
                race_predictions: metricas.race_predictions || {}
            };

            // --- Alerts derivadas de coachAnalysis ---
            const alerts: any[] = [];
            // riesgo_lesion puede ser string o objeto { nivel: 'alto', detalle: '...' }
            const riesgoRaw = coachAnalysis?.riesgo_lesion;
            const riesgo = typeof riesgoRaw === 'string' ? riesgoRaw : riesgoRaw?.nivel || riesgoRaw?.level || null;
            if (riesgo && riesgo !== 'bajo' && riesgo !== 'low') {
                alerts.push({
                    id: 'injury_risk',
                    level: riesgo === 'alto' || riesgo === 'high' ? 'danger' : 'warning',
                    title: 'Riesgo de Lesión Detectado',
                    message: `Tu riesgo de lesión actual es "${riesgo}". Considera reducir la intensidad.`
                });
            }
            if (acwr > 1.3) {
                alerts.push({
                    id: 'acwr_high',
                    level: acwr > 1.5 ? 'danger' : 'warning',
                    title: 'Carga Aguda Elevada',
                    message: `ACWR en ${acwr.toFixed(2)} — zona de riesgo. Descansa o reduce el volumen esta semana.`
                });
            }
            const estadoForma = coachAnalysis?.estado_forma;
            if (estadoForma && (estadoForma === 'bajo' || estadoForma === 'poor')) {
                alerts.push({
                    id: 'forma_baja',
                    level: 'info',
                    title: 'Forma Física en Descenso',
                    message: coachAnalysis?.recomendacion_hoy || 'Tu estado de forma actual es bajo. Considera priorizar recuperación.'
                });
            }

            res.json({
                load_balance,
                polarization,
                recovery_quality,
                aerobic_efficiency: null,
                monotony: null,
                notebooklm_benchmarks: null,
                cardio_status: cardio_status.hill_score || cardio_status.endurance_score ? cardio_status : null,
                planned_projection: null,
                alerts
            });
        } catch (e: any) {
            console.error('[kpis/training-intelligence] Error:', e);
            res.status(500).json({ error: e.message, alerts: [] });
        }
        return;
    }

    // GET /api-cloud/kpis/trends
    if (req.method === 'GET' && path === '/kpis/trends') {
        try {
            // ... (el código existente se mantiene, buscaremos el fin del if)
            const userId = (req.headers['x-user-id'] as string) || process.env.BIOENGINE_OWNER_UID || 'gonzalo-v4';
            const userPath = `users/${userId}`;

            const [activitiesSnap, healthSnap, painSnap] = await Promise.all([
                db.collection(`${userPath}/activities`).orderBy('start_time', 'desc').limit(60).get()
                    .catch(() => db.collection(`${userPath}/activities`).limit(60).get()),
                db.collection(`${userPath}/daily_health`).orderBy('date', 'desc').limit(30).get()
                    .catch(() => db.collection(`${userPath}/daily_health`).limit(30).get()),
                db.collection(`${userPath}/pain_logs`).orderBy('date', 'desc').limit(30).get()
                    .catch(() => ({ docs: [] }))
            ]);

            const activities: any[] = activitiesSnap.docs.map((d: any) => d.data());
            const healthDocs: any[] = healthSnap.docs.map((d: any) => d.data());
            const painDocs: any[] = (painSnap as any).docs.map((d: any) => d.data());

            // Construir mapa de dolor por fecha
            const painByDate: Record<string, number> = {};
            for (const p of painDocs) {
                const dt = p.date?.toDate?.() ? p.date.toDate().toISOString().slice(0, 10) : (typeof p.date === 'string' ? p.date.slice(0, 10) : null);
                if (dt) painByDate[dt] = Math.max(painByDate[dt] || 0, Number(p.intensity || p.level || 0));
            }

            // Construir mapa de carga diaria desde actividades
            const loadByDate: Record<string, number> = {};
            const effByDate: Record<string, { km: number; hr: number; count: number }> = {};
            for (const act of activities) {
                const actDate = act.start_time?.toDate?.() || (act.start_time ? new Date(act.start_time) : null);
                if (!actDate) continue;
                const dt = actDate.toISOString().slice(0, 10);
                const tl = Number(act.trainingLoad || act.training_load || 0);
                loadByDate[dt] = (loadByDate[dt] || 0) + tl;
                // Eficiencia aeróbica: km/h @ 100bpm (solo actividades con HR y distancia)
                const distKm = Number(act.distance_km || act.distanceKm || 0);
                const durMin = Number(act.duration_min || act.durationMinutes || 0);
                const hrAvg = Number(act.avg_heart_rate || act.avgHeartRate || 0);
                if (distKm > 0 && durMin > 0 && hrAvg > 0) {
                    const speedKmh = (distKm / durMin) * 60;
                    const eff = speedKmh * (100 / hrAvg);
                    if (!effByDate[dt]) effByDate[dt] = { km: 0, hr: 0, count: 0 };
                    effByDate[dt].km += distKm;
                    effByDate[dt].hr += hrAvg;
                    effByDate[dt].count++;
                }
            }

            // Construir serie temporal unificada desde daily_health
            const ms1d = 86400000;
            const loadValues = Object.values(loadByDate);
            const sortedDates = healthDocs
                .map((h: any) => {
                    const dt = h.date?.toDate?.() ? h.date.toDate().toISOString().slice(0, 10) : (typeof h.date === 'string' ? h.date.slice(0, 10) : null);
                    return dt;
                })
                .filter(Boolean)
                .sort();

            const trendData = sortedDates.map((dt) => {
                const h = healthDocs.find((hd: any) => {
                    const d = hd.date?.toDate?.() ? hd.date.toDate().toISOString().slice(0, 10) : (typeof hd.date === 'string' ? hd.date.slice(0, 10) : null);
                    return d === dt;
                });
                const hrv = Number(h?.hrv_value || h?.hrv || 0);
                const sleep = Number(h?.sleep_hours || h?.sleepHours || 0);
                const stress = Number(h?.stress_level || h?.stressLevel || 25);
                let recovery = 50;
                if (hrv > 0 || sleep > 0) {
                    recovery = 50 + (hrv - 40) * 0.5 + (sleep - 6) * 10 - (stress - 20) * 0.5;
                    recovery = Math.min(100, Math.max(0, Math.round(recovery)));
                }

                const load = loadByDate[dt] || 0;

                // load_7d: promedio rolling 7 días
                const dtMs = new Date(dt).getTime();
                let load7sum = 0, load7count = 0;
                for (const [d2, l2] of Object.entries(loadByDate)) {
                    const d2ms = new Date(d2).getTime();
                    if (d2ms <= dtMs && d2ms >= dtMs - 7 * ms1d) {
                        load7sum += l2;
                        load7count++;
                    }
                }
                const load_7d = load7count > 0 ? Math.round(load7sum / 7) : 0;

                // acwr
                let chronic28sum = 0, chronic28count = 0;
                for (const [d2, l2] of Object.entries(loadByDate)) {
                    const d2ms = new Date(d2).getTime();
                    if (d2ms <= dtMs && d2ms >= dtMs - 28 * ms1d) {
                        chronic28sum += l2;
                        chronic28count++;
                    }
                }
                const chronic = chronic28count > 0 ? chronic28sum / 28 : 1;
                const acute = load7sum / 7;
                const acwr = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : 1.0;

                // Eficiencia aeróbica
                const effEntry = effByDate[dt];
                const efficiency = effEntry && effEntry.count > 0
                    ? Math.round((effEntry.km / effEntry.count / (effEntry.hr / effEntry.count) * 100) * 100) / 100
                    : null;

                return {
                    date: dt,
                    load,
                    recovery,
                    load_7d,
                    acwr,
                    efficiency,
                    pain_level: painByDate[dt] || 0
                };
            });

            res.json(trendData);
        } catch (e: any) {
            console.error('[kpis/trends] Error:', e);
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Webhook Withings (Notify API)
    if (path === '/webhook/withings' || path === '/webhook/withings/') {
        try {
            if (req.method === 'POST') {
                // Withings envía datos mediante form-urlencoded o JSON
                const userid = req.body?.userid || req.query?.userid;
                if (userid) {
                    // Encontrar al userId local usando collectionGroup en 'secrets'
                    const snap = await db.collectionGroup('secrets')
                        .where('userid', '==', String(userid))
                        .limit(1)
                        .get();

                    if (!snap.empty && snap.docs[0].ref.parent.parent) {
                        const localUserId = snap.docs[0].ref.parent.parent.id;
                        
                        // Procesar asincronamente
                        const { syncWithings } = await import('./services/health_sync.js');
                        syncWithings(localUserId).catch(err => {
                            console.error('[Withings Webhook] Error en sync asíncrono:', err.message);
                        });
                    }
                }
            }
            
            // Para CUALQUIER tipo de request (HEAD, GET, POST con o sin datos) 
            // devolvemos 200 INMEDIATAMENTE. Withings exige 200 OK en < 2 seg.
            res.status(200).send('OK');
        } catch (e: any) {
            console.error('[Withings Webhook] Error:', e.message);
            // Siempre devolver 200 para que Withings no desactive el webhook
            res.status(200).send('OK');
        }
        return;
    }

    // Endpoint admin para suscribir al Webhook (usado temporalmente para setup)
    if (path === '/webhook/withings/setup') {
        try {
            const adminToken = req.headers['x-admin-token'] || req.query.admin_token;
            if (adminToken !== (ENV.BIOENGINE_ADMIN_TOKEN || 'bioengine-local')) {
                res.status(403).json({ error: 'Unauthorized' });
                return;
            }
            
            const userId = (req.headers['x-user-id'] as string) || (req.query.user_id as string) || process.env.BIOENGINE_OWNER_UID;
            if (!userId) {
                res.status(400).json({ error: 'user_id required' });
                return;
            }
            
            const tokensSnap = await db.collection('users').doc(userId).collection('secrets').doc('withings_tokens').get();
            if (!tokensSnap.exists) {
                res.status(404).json({ error: 'Withings tokens not found' });
                return;
            }
            
            const tokens = tokensSnap.data();
            const baseUrl = 'https://bioengine-v4.web.app';
            const callbackUrl = `${baseUrl}/api-cloud/webhook/withings`;
            
            const params = new URLSearchParams({
                action: 'subscribe',
                callbackurl: callbackUrl,
                appli: '1' // Básculas
            });

            const resp = await fetch('https://wbsapi.withings.net/notify', {
                method: 'POST',
                body: params,
                headers: { Authorization: `Bearer ${tokens?.access_token}` }
            });

            const json = await resp.json() as any;
            res.json({ status: 'ok', result: json, callbackUrl });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Fallback para cualquier otro /kpis/ no reconocido
    if (path.includes('/kpis/')) {
        res.json({ alerts: [] });
        return;
    }
    if (path.includes('/memory')) {
        res.json({ status: 'memory_service_disconnected', data: [] });
        return;
    }
    if (path.includes('/sync-all')) {
        try {
            const { syncGarmin, syncWithings } = await import('./services/health_sync.js');
            const syncUserId = (req.headers['x-user-id'] as string) || process.env.BIOENGINE_OWNER_UID;
            if (!syncUserId) {
                res.status(400).json({ error: 'x-user-id header requerido' });
                return;
            }
            const [garminResult, withingsResult] = await Promise.allSettled([
                syncGarmin(syncUserId),
                syncWithings(syncUserId)
            ]);
            const garmin = garminResult.status === 'fulfilled' ? garminResult.value : { added: 0, error: (garminResult.reason as any)?.message };
            const withings = withingsResult.status === 'fulfilled' ? withingsResult.value : { added: 0, error: (withingsResult.reason as any)?.message };
            res.json({ status: 'ok', garmin, withings });
        } catch (e: any) {
            res.status(500).json({ status: 'error', error: e.message });
        }
        return;
    }

    // POST /api-cloud/races/apply — re-aplica matching de carreras (trail/road) para un rango.
    // Body:
    // - { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }              (recomendado)
    // - { date?: 'YYYY-MM-DD', days?: number }               (compat, fallback)
    if (req.method === 'POST' && path === '/races/apply') {
        try {
            const userId = (req.headers['x-user-id'] as string) || process.env.BIOENGINE_OWNER_UID;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }

            const from = req.body?.from as string | undefined;
            const to = req.body?.to as string | undefined;

            const isDateKey = (s: any) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
            const addDays = (dateKey: string, delta: number) => {
                const d = new Date(`${dateKey}T00:00:00.000Z`);
                d.setUTCDate(d.getUTCDate() + delta);
                return d.toISOString().split('T')[0];
            };

            let startKey: string;
            let endKey: string;

            if (from || to) {
                if (!isDateKey(from) || !isDateKey(to)) {
                    res.status(400).json({ error: "Body inválido: usar { from:'YYYY-MM-DD', to:'YYYY-MM-DD' }" });
                    return;
                }
                startKey = from!;
                endKey = to!;
            } else {
                // Compat: date+days, pero sin cap a 14 acá (la protección la hacemos por rango total)
                const date = (req.body?.date as string | undefined) || new Date().toISOString().split('T')[0];
                const days = Math.max(1, Number(req.body?.days || 1));
                if (!isDateKey(date) || !Number.isFinite(days)) {
                    res.status(400).json({ error: "Body inválido: usar { date:'YYYY-MM-DD', days:number }" });
                    return;
                }
                startKey = addDays(date, -(days - 1));
                endKey = date;
            }

            // Safety: limitar tamaño del rango para evitar timeouts.
            // 800 días cubre ~2.2 años (suficiente para históricos típicos).
            const MAX_DAYS = 800;
            const start = new Date(`${startKey}T00:00:00.000Z`);
            const end = new Date(`${endKey}T00:00:00.000Z`);
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
                res.status(400).json({ error: 'Rango inválido: end < start o fechas inválidas' });
                return;
            }
            const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
            if (diffDays > MAX_DAYS) {
                res.status(400).json({ error: `Rango demasiado grande (${diffDays} días). Máximo: ${MAX_DAYS}.` });
                return;
            }

            const results: any[] = [];
            for (let i = 0; i < diffDays; i++) {
                const dateStr = addDays(startKey, i);
                results.push(await applyRaceTagsForDate(userId, dateStr));
            }

            res.json({ status: 'ok', userId, from: startKey, to: endKey, days: diffDays, results });
        } catch (e: any) {
            res.status(500).json({ status: 'error', error: e.message });
        }
        return;
    }
    if (req.method === 'GET' && path === '/races') {
        try {
            const userId = (req.headers['x-user-id'] as string) || process.env.BIOENGINE_OWNER_UID;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }

            let snap;
            try {
                snap = await db.collection('users').doc(userId).collection('races')
                    .orderBy('date', 'desc')
                    .limit(500)
                    .get();
            } catch {
                snap = await db.collection('users').doc(userId).collection('races')
                    .limit(500)
                    .get();
            }

            const races = snap.docs
                .map((d: any) => ({ id: d.id, ...d.data() }))
                .sort((a: any, b: any) => String(b.date || '').localeCompare(String(a.date || '')));
            res.json({ status: 'ok', userId, races });
        } catch (e: any) {
            res.status(500).json({ status: 'error', error: e.message });
        }
        return;
    }
    if (req.method === 'POST' && path === '/races') {
        try {
            const userId = (req.headers['x-user-id'] as string) || process.env.BIOENGINE_OWNER_UID;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }

            const { FieldValue } = await import('firebase-admin/firestore');
            const race = req.body || {};
            if (!race.date || !race.name) {
                res.status(400).json({ error: 'date y name son requeridos' });
                return;
            }

            const payload = {
                date: String(race.date),
                name: String(race.name || ''),
                distance_km: Number(race.distance_km || 0),
                surface: race.surface === 'trail' ? 'trail' : 'road',
                bib: race.bib || null,
                overall_rank: race.overall_rank || null,
                gender_rank: race.gender_rank || null,
                shoes: race.shoes || null,
                source: race.source || 'manual',
                updated_at: FieldValue.serverTimestamp()
            };

            let ref;
            if (race.id) {
                ref = db.collection('users').doc(userId).collection('races').doc(String(race.id));
                await ref.set(payload, { merge: true });
            } else {
                ref = await db.collection('users').doc(userId).collection('races').add({
                    ...payload,
                    created_at: FieldValue.serverTimestamp()
                });
            }

            res.json({ status: 'ok', userId, id: ref.id });
        } catch (e: any) {
            res.status(500).json({ status: 'error', error: e.message });
        }
        return;
    }
    if (req.method === 'POST' && path === '/races/assign') {
        try {
            const userId = (req.headers['x-user-id'] as string) || process.env.BIOENGINE_OWNER_UID;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }

            const { FieldValue } = await import('firebase-admin/firestore');
            const raceId = String(req.body?.raceId || '');
            const activityId = String(req.body?.activityId || '');
            if (!raceId || !activityId) {
                res.status(400).json({ error: 'raceId y activityId son requeridos' });
                return;
            }

            const raceRef = db.collection('users').doc(userId).collection('races').doc(raceId);
            const activityRef = db.collection('users').doc(userId).collection('activities').doc(activityId);
            const [raceSnap, activitySnap] = await Promise.all([raceRef.get(), activityRef.get()]);
            if (!raceSnap.exists) { res.status(404).json({ error: 'Carrera no encontrada' }); return; }
            if (!activitySnap.exists) { res.status(404).json({ error: 'Actividad no encontrada' }); return; }

            const race = raceSnap.data() || {};
            const surface = race.surface === 'trail' ? 'trail' : 'road';
            await activityRef.set({
                tipo: surface === 'trail' ? 'Competición Trail' : 'Competición Calle',
                surface,
                race: {
                    matched: true,
                    manual: true,
                    source: 'manual-race-assign',
                    raceId,
                    name: race.name || '',
                    date: race.date || '',
                    distance_km: Number(race.distance_km || 0),
                    surface,
                    matchedAt: FieldValue.serverTimestamp()
                },
                updated_at: FieldValue.serverTimestamp()
            }, { merge: true });

            res.json({ status: 'ok', userId, raceId, activityId });
        } catch (e: any) {
            res.status(500).json({ status: 'error', error: e.message });
        }
        return;
    }
    if (req.method === 'POST' && path === '/activities/category') {
        try {
            const userId = (req.headers['x-user-id'] as string) || process.env.BIOENGINE_OWNER_UID;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }

            const { FieldValue } = await import('firebase-admin/firestore');
            const activityId = String(req.body?.activityId || '');
            const category = String(req.body?.category || '');
            const normalizedCategory = category
                .replace('Competicion', 'Competición')
                .trim();
            if (!activityId) {
                res.status(400).json({ error: 'activityId es requerido' });
                return;
            }

            const activityRef = db.collection('users').doc(userId).collection('activities').doc(activityId);
            const activitySnap = await activityRef.get();
            if (!activitySnap.exists) { res.status(404).json({ error: 'Actividad no encontrada' }); return; }

            const patch: any = { updated_at: FieldValue.serverTimestamp() };
            if (category === 'clear') {
                patch.tipo = FieldValue.delete();
                patch.surface = FieldValue.delete();
                patch.race = FieldValue.delete();
            } else {
                patch.tipo = normalizedCategory;
                if (normalizedCategory === 'Competición Calle' || normalizedCategory === 'Competición Trail') {
                    const surface = normalizedCategory === 'Competición Trail' ? 'trail' : 'road';
                    patch.surface = surface;
                    patch.race = {
                        matched: true,
                        manual: true,
                        source: 'manual-category',
                        surface,
                        matchedAt: FieldValue.serverTimestamp()
                    };
                } else {
                    patch.surface = FieldValue.delete();
                    patch.race = FieldValue.delete();
                }
            }

            await activityRef.set(patch, { merge: true });
            res.json({ status: 'ok', userId, activityId, category });
        } catch (e: any) {
            res.status(500).json({ status: 'error', error: e.message });
        }
        return;
    }
    if (path.includes('/ai/voice/speech')) {
        // TTS vía ElevenLabs (cloud-native). Ver agent/tts.ts.
        const text = req.query.text as string;
        if (!text) {
            res.status(400).json({ error: 'Text is required' });
            return;
        }
        try {
            const { generateSpeech } = await import('./agent/tts.js');
            const buffer = await generateSpeech(text);
            if (!buffer) {
                res.status(503).json({ error: 'TTS no disponible: ELEVENLABS_API_KEY no configurada.' });
                return;
            }
            res.set('Content-Type', 'audio/mpeg');
            res.send(buffer);
            return;
        } catch (err: any) {
            res.status(500).json({ error: err.message });
            return;
        }
    }

    // Knowledge API — exercise explain & regression
    if (req.method === 'GET' && path.startsWith('/knowledge/exercise/')) {
        const userId = req.headers['x-user-id'] as string;
        if (!userId) {
            res.status(400).json({ error: 'X-User-Id header requerido' });
            return;
        }
        const exerciseName = decodeURIComponent(path.replace('/knowledge/exercise/', ''));
        try {
            const { explainExercise } = await import('./tools/exercise_tools.js');
            const result = await explainExercise(exerciseName);
            if (!result.success) {
                res.status(500).json({ error: result.message || 'Error al explicar ejercicio' });
                return;
            }
            res.json({ exercise: { name: result.exercise, explanation: result.explanation } });
        } catch (e: any) {
            console.error('Error en /knowledge/exercise:', e);
            res.status(500).json({ error: e.message || 'Error interno' });
        }
        return;
    }

    if (req.method === 'GET' && path.startsWith('/knowledge/regression/')) {
        const userId = req.headers['x-user-id'] as string;
        if (!userId) {
            res.status(400).json({ error: 'X-User-Id header requerido' });
            return;
        }
        const exerciseName = decodeURIComponent(path.replace('/knowledge/regression/', ''));
        try {
            const { suggestRegression } = await import('./tools/exercise_tools.js');
            const result = await suggestRegression(exerciseName);
            if (!result.success) {
                res.status(500).json({ error: result.message || 'Error al sugerir regresiones' });
                return;
            }
            res.json({ exercise: result.exercise, regressions: result.regressions });
        } catch (e: any) {
            console.error('Error en /knowledge/regression:', e);
            res.status(500).json({ error: e.message || 'Error interno' });
        }
        return;
    }

    if (path === '/knowledge/system_manual') {
        res.json({
            content: '',
            sections: [],
            lastUpdated: null,
            available: false
        });
        return;
    }
    if (path.startsWith('/knowledge') || path.startsWith('/exercises')) {
        // El backend Python no existe en producción. Devolvemos 501 claro.
        res.status(501).json({
            error: 'Este endpoint requería el backend Python local (no disponible en GCP).',
            hint: 'Usa bioengine_explain_exercise o bioengine_suggest_regression desde el bot Telegram.',
            path
        });
        return;
    }
    if (path.includes('/health')) {
        res.json({ status: 'ok' });
        return;
    }

    // GET /api-cloud/stats/llm-usage — resumen de costos LLM por usuario (ítem #17)
    if (req.method === 'GET' && path === '/stats/llm-usage') {
        try {
            const userId = (req.headers['x-user-id'] as string) || process.env.BIOENGINE_OWNER_UID || 'gonzalo-v4';
            const [userSnap, usageSnap] = await Promise.all([
                db.collection('users').doc(userId).get(),
                db.collection(`users/${userId}/llm_usage`)
                    .orderBy('timestamp', 'desc')
                    .limit(20)
                    .get()
                    .catch(() => ({ docs: [] as any[] }))
            ]);
            const summary = userSnap.exists ? (userSnap.data()?.llm_usage_summary || {}) : {};
            const records = (usageSnap as any).docs.map((d: any) => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    timestamp: data.timestamp?.toDate?.()?.toISOString() || null
                };
            });
            res.json({ summary, records });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Auth: Custom Token endpoint for Dashboard Firebase Auth
    if (req.method === 'POST' && path === '/auth/token') {
        const { adminToken, idToken } = req.body;
        try {
            const { getAuth } = await import('firebase-admin/auth');
            const { getApp, initializeApp } = await import('firebase-admin/app');
            // Cloud Functions 2nd Gen run with the Compute Engine default SA
            // (PROJECT_NUMBER-compute@developer.gserviceaccount.com).
            // That SA has iam.serviceAccounts.signBlob on itself, which is required
            // by createCustomToken. We pass it as serviceAccountId so the Admin SDK
            // uses the metadata-server signing path instead of a key file.
            const PROJECT_NUMBER = '787392583235';
            const SA_EMAIL = `${PROJECT_NUMBER}-compute@developer.gserviceaccount.com`;
            let authApp;
            const AUTH_APP_NAME = 'auth-token-app';
            try {
                authApp = getApp(AUTH_APP_NAME);
            } catch {
                authApp = initializeApp({ serviceAccountId: SA_EMAIL }, AUTH_APP_NAME);
            }

            if (adminToken) {
                // Modo admin: token de admin en variable de entorno BIOENGINE_ADMIN_TOKEN
                if (adminToken !== (ENV.BIOENGINE_ADMIN_TOKEN || 'bioengine-local')) {
                    res.status(401).json({ error: 'Unauthorized' });
                    return;
                }
                const OWNER_UID = process.env.BIOENGINE_OWNER_UID;
                if (!OWNER_UID) {
                    res.status(500).json({ error: 'BIOENGINE_OWNER_UID no configurado en el servidor' });
                    return;
                }
                await getAuth(authApp).setCustomUserClaims(OWNER_UID, { role: 'admin' });
                const customToken = await getAuth(authApp).createCustomToken(OWNER_UID, { role: 'admin' });
                res.json({ token: customToken, userId: OWNER_UID });
                return;
            }

            if (idToken) {
                // Modo multi-usuario: verificar Google ID token
                try {
                    const decodedToken = await getAuth(authApp).verifyIdToken(idToken);
                    const uid = decodedToken.uid;

                    // Crear perfil si es primera vez
                    const userRef = db.doc(`users/${uid}`);
                    const userSnap = await userRef.get();
                    if (!userSnap.exists) {
                        const { FieldValue } = await import('firebase-admin/firestore');
                        await userRef.set({
                            email: decodedToken.email || '',
                            nombre: decodedToken.name || '',
                            role: 'user',
                            status: 'pending',
                            onboardingCompleted: false,
                            createdAt: FieldValue.serverTimestamp()
                        });
                        // Notificar al admin vía Telegram que llegó un nuevo usuario
                        const OWNER_TELEGRAM_ID = process.env.TELEGRAM_ALLOWED_USER_IDS?.split(',')[0]?.trim();
                        if (OWNER_TELEGRAM_ID) {
                            try {
                                await bot.api.sendMessage(
                                    OWNER_TELEGRAM_ID,
                                    `Nueva solicitud de acceso\n\nUID: ${uid}\nEmail: ${decodedToken.email || '(sin email)'}\nNombre: ${decodedToken.name || '(sin nombre)'}\n\nAprueba o rechaza desde el panel admin: POST /api-cloud/admin/users/${uid}/status`
                                );
                            } catch (telegramErr: any) {
                                console.error('[auth/token] Error enviando notificación Telegram:', telegramErr.message);
                            }
                        }
                        // Notificar al admin por email
                        await sendNewUserNotification(uid, decodedToken.email || '', decodedToken.name || '');
                    }

                    const isOwner = uid === (process.env.BIOENGINE_OWNER_UID);
                    if (isOwner) {
                        await getAuth(authApp).setCustomUserClaims(uid, { role: 'admin' });
                    }
                    const customToken = await getAuth(authApp).createCustomToken(uid, isOwner ? { role: 'admin' } : { role: 'user' });
                    res.json({ token: customToken, userId: uid });
                    return;
                } catch (err: any) {
                    res.status(401).json({ error: 'Invalid ID token', detail: err.message });
                    return;
                }
            }

            res.status(400).json({ error: 'Provide adminToken or idToken' });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Pain history
    if (req.method === 'GET' && path === '/pain/history') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const limitN = parseInt((req.query.limit as string) || '10');
            const snapshot = await db.collection(`users/${userId}/pain_logs`)
                .orderBy('timestamp', 'desc')
                .limit(limitN)
                .get();
            const history = snapshot.docs.map((d: any) => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    date: data.date || (data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString()),
                };
            });
            res.json({ history });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // POST /pain — registrar nuevo evento de dolor
    if (req.method === 'POST' && path === '/pain') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const { level, location, side, notes, source } = req.body;
            if (level === undefined || level === null) { res.status(400).json({ error: 'Campo level es requerido' }); return; }
            if (!location) { res.status(400).json({ error: 'Campo location es requerido' }); return; }
            if (!side) { res.status(400).json({ error: 'Campo side es requerido' }); return; }
            const painRef = db.collection(`users/${userId}/pain_logs`).doc();
            await painRef.set({
                level: Number(level),
                location,
                side,
                notes: notes || '',
                source: source || 'user_manual',
                date: new Date().toISOString(),
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
            res.json({ success: true, id: painRef.id });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // DELETE /pain/:id — eliminar un registro de dolor
    if (req.method === 'DELETE' && path.startsWith('/pain/')) {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const docId = path.replace('/pain/', '').trim();
            if (!docId) { res.status(400).json({ error: 'ID del documento es requerido' }); return; }
            const docRef = db.collection(`users/${userId}/pain_logs`).doc(docId);
            const docSnap = await docRef.get();
            if (!docSnap.exists) { res.status(404).json({ error: 'Registro no encontrado' }); return; }
            await docRef.delete();
            res.json({ success: true });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Remote log sink (frontend telemetry — silent accept)
    if (req.method === 'POST' && path === '/log/remote') {
        res.json({ ok: true });
        return;
    }

    // Withings: exchange code for tokens
    if (req.method === 'POST' && path === '/withings/set-code') {
        const { code, redirectUri } = req.body;
        const userId = (req.headers['x-user-id'] as string) || process.env.BIOENGINE_OWNER_UID;
        if (!userId) {
            res.status(400).json({ error: 'x-user-id header requerido' });
            return;
        }
        if (!code) {
            res.status(400).json({ error: 'code is required' });
            return;
        }
        try {
            const tokens = await withingsExchangeCode(userId, code, redirectUri || 'https://bioengine-v4.web.app/callback');
            res.json({ success: true, message: 'Withings conectado con éxito', userid: tokens.userid });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Garmin OAuth token ingestion — recibe el token generado desde IP local y lo persiste
    if (req.method === 'POST' && path === '/garmin/set-token') {
        const { adminToken, oauthToken } = req.body;
        const OWNER_UID = process.env.BIOENGINE_OWNER_UID;
        const requestedUserId = (req.headers['x-user-id'] as string) || OWNER_UID;
        const isAdmin = adminToken === (ENV.BIOENGINE_ADMIN_TOKEN || 'bioengine-local');
        // Permitir solo si: (a) tiene token de admin válido, o (b) el usuario solo escribe su propio token
        if (!isAdmin && requestedUserId !== OWNER_UID) {
            res.status(401).json({ error: 'Unauthorized: solo el propietario puede setear su propio token' });
            return;
        }
        if (!isAdmin) {
            // Sin token admin, validar que el userId sea un usuario registrado en Firestore
            const userDoc = await db.collection('users').doc(requestedUserId).get();
            if (!userDoc.exists) {
                res.status(403).json({ error: 'Usuario no registrado en el sistema' });
                return;
            }
        }
        if (!oauthToken) {
            res.status(400).json({ error: 'oauthToken requerido' });
            return;
        }
        try {
            const { FieldValue } = await import('firebase-admin/firestore');
            await db.collection('users').doc(requestedUserId)
                .collection('secrets').doc('garmin_oauth')
                .set({ token: oauthToken, updated_at: FieldValue.serverTimestamp() });
            res.json({ ok: true, message: `Token Garmin guardado para usuario ${requestedUserId}` });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Garmin save credentials — guarda email/password en secrets para auto-refresh silencioso
    if (req.method === 'POST' && path === '/garmin/save-credentials') {
        const { adminToken, email, password } = req.body;
        const OWNER_UID = process.env.BIOENGINE_OWNER_UID;
        const userId = (req.headers['x-user-id'] as string) || OWNER_UID;
        const isAdmin = adminToken === (ENV.BIOENGINE_ADMIN_TOKEN || 'bioengine-local');
        if (!isAdmin && userId !== OWNER_UID) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (!email || !password) {
            res.status(400).json({ error: 'email y password requeridos' });
            return;
        }
        try {
            const { FieldValue } = await import('firebase-admin/firestore');
            await db.collection('users').doc(userId)
                .collection('secrets').doc('garmin')
                .set({ email, password, updated_at: FieldValue.serverTimestamp() });
            res.json({ ok: true, message: 'Credenciales Garmin guardadas en Firestore' });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Garmin token status — indica si el usuario tiene token OAuth configurado
    if (req.method === 'GET' && path === '/garmin/token-status') {
        const userId = req.headers['x-user-id'] as string;
        if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
        try {
            const oauthDoc = await db.collection('users').doc(userId)
                .collection('secrets').doc('garmin_oauth').get();
            if (!oauthDoc.exists) {
                res.json({ connected: false, lastSync: null });
                return;
            }
            const data = oauthDoc.data() || {};
            const updatedAt = data.updated_at?.toDate?.()?.toISOString() || null;
            res.json({ connected: true, lastSync: updatedAt });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Withings: status endpoint
    if (req.method === 'GET' && path === '/withings/status') {
        const userId = req.headers['x-user-id'] as string;
        if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
        try {
            const tokensDoc = await db.collection('users').doc(userId)
                .collection('secrets').doc('withings').get();
            if (!tokensDoc.exists) {
                res.json({ connected: false, lastSync: null });
                return;
            }
            const data = tokensDoc.data() || {};
            const updatedAt = data.updated_at?.toDate?.()?.toISOString() || null;
            res.json({ connected: true, lastSync: updatedAt, userid: data.userid });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Profile: datos del usuario desde Firestore
    if (req.method === 'GET' && path === '/profile') {
        try {
            // BUG FIX: No aceptar userId desde query params — solo X-User-Id header
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                res.json({});
                return;
            }
            const data = userDoc.data() || {};
            // Calcular FC máxima y zonas con las fórmulas del ContextManager
            const { mhr, formula, zones } = calcMaxHRAndZones(data);
            // altura_cm y peso_objetivo_kg: aliases usados por ProfileView.jsx
            const alturaCm = data.altura_cm || data.estatura || data.altura || data.height || null;
            const pesoObjetivoKg = data.peso_objetivo_kg || data.peso_objetivo || null;
            // experiencia_deportiva: estructura usada por ProfileView.jsx
            const experienciaDeportiva = data.experiencia_deportiva || {
                nivel_actual: data.nivel || 'Intermedio',
                deportes_principales: data.deportes || [],
                anos_experiencia: {}
            };
            // Devolver todos los campos del perfil (flat, no anidado en 'profile')
            res.json({
                nombre: data.nombre || data.name || '',
                fechaNacimiento: data.fechaNacimiento || null,
                edad: data.edad || data.age || null,
                sexo: data.sexo || null,
                estatura: data.estatura || data.altura || data.height || null,
                altura_cm: alturaCm,
                peso: data.peso || data.weight || null,
                peso_objetivo_kg: pesoObjetivoKg,
                medicaciones: data.medicaciones || [],
                lesiones: data.lesiones || [],
                deportes: data.deportes || [],
                nivel: data.nivel || null,
                objetivo: data.objetivo || null,
                diasDisponibles: data.diasDisponibles || null,
                restricciones: data.restricciones || null,
                experiencia_deportiva: experienciaDeportiva,
                preferencias: data.preferencias || {},
                telegramChatId: data.telegramChatId || null,
                role: data.role || 'user',
                status: data.status || null,
                onboardingCompleted: data.onboardingCompleted || false,
                hrZones: { mhr, formula, zones },
            });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Profile: guardar/actualizar datos del usuario en Firestore (POST y PUT)
    if ((req.method === 'POST' || req.method === 'PUT') && path === '/profile') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            // Aceptar payload tanto plano como anidado en 'profile'
            const profileData = req.body?.profile || req.body || {};

            // Solo actualizar campos permitidos (nunca sobreescribir secrets o role desde cliente)
            const allowedFields: Record<string, unknown> = {};
            const allowed = ['nombre', 'edad', 'sexo', 'peso', 'altura', 'estatura', 'fechaNacimiento',
                             'altura_cm', 'peso_objetivo_kg', 'experiencia_deportiva',
                             'medicaciones', 'lesiones', 'deportes', 'nivel', 'objetivo',
                             'diasDisponibles', 'restricciones', 'preferencias', 'telegramChatId',
                             'onboardingCompleted', 'settings'];

            for (const key of allowed) {
                if (key in profileData) {
                    allowedFields[key] = profileData[key];
                }
            }

            // altura_cm → también sincronizar en estatura para consistencia interna
            if ('altura_cm' in allowedFields && !('estatura' in allowedFields)) {
                allowedFields['estatura'] = allowedFields['altura_cm'];
            }

            if (Object.keys(allowedFields).length === 0) {
                res.status(400).json({ error: 'No valid fields to update' });
                return;
            }

            await db.collection('users').doc(userId).set(allowedFields, { merge: true });
            res.json({ success: true, updated: Object.keys(allowedFields) });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Settings: preferencias del usuario desde Firestore
    if (req.method === 'GET' && path === '/settings') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const userDoc = await db.collection('users').doc(userId).get();
            const data = userDoc.exists ? (userDoc.data() || {}) : {};
            res.json({
                settings: {
                    notificaciones: data.settings?.notificaciones ?? true,
                    idioma: data.settings?.idioma || 'es',
                    unidades: data.settings?.unidades || 'metric',
                    syncFrequency: data.settings?.syncFrequency || 'auto',
                    theme: data.settings?.theme || 'dark',
                }
            });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Settings: guardar preferencias del usuario en Firestore
    if (req.method === 'POST' && path === '/settings') {
        try {
            const OWNER_UID = process.env.BIOENGINE_OWNER_UID;
            const userId = (req.headers['x-user-id'] as string) || OWNER_UID;
            const settings = req.body?.settings || {};

            await db.collection('users').doc(userId).set({ settings }, { merge: true });
            res.json({ success: true });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Settings: guardar API key de proveedor de IA
    // POST /api-cloud/settings/api-key  { provider: 'gemini'|'groq'|..., api_key: '...', enabled: true }
    if (req.method === 'POST' && path === '/settings/api-key') {
        try {
            const { provider, api_key, enabled } = req.body || {};
            if (!provider || !api_key) {
                res.status(400).json({ error: 'provider y api_key son requeridos' });
                return;
            }
            const SECRET_MAP: Record<string, string> = {
                gemini: 'GEMINI_API_KEY',
                groq: 'GROQ_API_KEY',
                openai: 'OPENROUTER_API_KEY',
                anthropic: 'OPENROUTER_API_KEY',
                openrouter: 'OPENROUTER_API_KEY',
            };
            const secretName = SECRET_MAP[provider.toLowerCase()];
            if (!secretName) {
                res.status(400).json({ error: `Proveedor '${provider}' no soportado. Usa: ${Object.keys(SECRET_MAP).join(', ')}` });
                return;
            }
            try {
                const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
                const smClient = new SecretManagerServiceClient();
                const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'bioengine-v4';
                const secretPath = `projects/${projectId}/secrets/${secretName}`;
                const [version] = await smClient.addSecretVersion({
                    parent: secretPath,
                    payload: { data: Buffer.from(api_key, 'utf8') }
                });
                const versionName = version.name?.split('/').pop() || 'unknown';
                res.json({ success: true, provider, secretName, version: versionName });
            } catch (smError: any) {
                console.error('[settings/api-key] Secret Manager error:', smError.message);
                res.status(500).json({ error: smError.message });
            }
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Admin: listar todos los usuarios
    if (req.method === 'GET' && path === '/admin/users') {
        const adminToken = req.headers['x-admin-token'];
        if (adminToken !== (ENV.BIOENGINE_ADMIN_TOKEN || 'bioengine-local')) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        try {
            const usersSnap = await db.collection('users').get();
            const users = usersSnap.docs.map((doc: any) => {
                const data = doc.data();
                return {
                    uid: doc.id,
                    nombre: data.nombre || '',
                    email: data.email || '',
                    role: data.role || 'user',
                    onboardingCompleted: data.onboardingCompleted || false,
                    createdAt: data.createdAt || null,
                    deportes: data.deportes || [],
                    objetivo: data.objetivo || ''
                };
            });
            res.json({ users });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Admin: ver datos de un usuario específico
    const adminDataMatch = path.match(/^\/admin\/users\/([^/]+)\/data$/);
    if (req.method === 'GET' && adminDataMatch) {
        const adminToken = req.headers['x-admin-token'];
        if (adminToken !== (ENV.BIOENGINE_ADMIN_TOKEN || 'bioengine-local')) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        try {
            const targetUid = adminDataMatch[1];
            const [bioSnap, actSnap, planSnap, userSnap] = await Promise.all([
                db.collection('users').doc(targetUid).collection('biometrics')
                    .orderBy('timestamp', 'desc').limit(1).get()
                    .catch(() => db.collection('users').doc(targetUid).collection('biometrics').limit(1).get()),
                db.collection('users').doc(targetUid).collection('activities')
                    .orderBy('timestamp', 'desc').limit(5).get()
                    .catch(() => db.collection('users').doc(targetUid).collection('activities').limit(5).get()),
                db.collection('users').doc(targetUid).collection('plans')
                    .orderBy('updatedAt', 'desc').limit(1).get()
                    .catch(() => db.collection('users').doc(targetUid).collection('plans').limit(1).get()),
                db.collection('users').doc(targetUid).get()
            ]);
            res.json({
                profile: userSnap.exists ? userSnap.data() : null,
                lastBiometric: bioSnap.empty ? null : bioSnap.docs[0].data(),
                recentActivities: actSnap.docs.map((d: any) => d.data()),
                activePlan: planSnap.empty ? null : planSnap.docs[0].data()
            });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // =============================================
    // CATALOG — Catálogo público de medicamentos y dolencias
    // =============================================

    // GET /api-cloud/catalog — público, sin autenticación requerida
    if (req.method === 'GET' && path === '/catalog') {
        try {
            const [medSnap, condSnap] = await Promise.all([
                db.collection('catalog').doc('medications').get(),
                db.collection('catalog').doc('conditions').get()
            ]);
            res.json({
                medications: medSnap.data()?.items || [],
                conditions: condSnap.data()?.items || []
            });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // POST /api-cloud/catalog/propose — usuario autenticado propone nuevo ítem
    if (req.method === 'POST' && path === '/catalog/propose') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) {
                res.status(401).json({ error: 'x-user-id header requerido' });
                return;
            }
            const { type, value } = req.body || {};
            if (!type || !value || !['medication', 'condition'].includes(type)) {
                res.status(400).json({ error: 'type (medication|condition) y value son requeridos' });
                return;
            }
            const { FieldValue } = await import('firebase-admin/firestore');
            const proposalRef = await db.collection('catalog_proposals').add({
                type,
                value: value.trim(),
                proposedBy: userId,
                status: 'pending',
                createdAt: FieldValue.serverTimestamp()
            });

            // Notificar al admin vía Telegram
            const OWNER_TELEGRAM_ID = process.env.TELEGRAM_ALLOWED_USER_IDS?.split(',')[0]?.trim();
            if (OWNER_TELEGRAM_ID) {
                try {
                    await bot.api.sendMessage(
                        OWNER_TELEGRAM_ID,
                        `Nueva propuesta de catálogo\n\nTipo: ${type}\nValor: ${value}\nPropuesto por: ${userId}\nID: ${proposalRef.id}\n\nRevisa desde el panel admin.`
                    );
                } catch (telegramErr: any) {
                    console.error('[catalog/propose] Error enviando notificación Telegram:', telegramErr.message);
                }
            }

            // Notificar al admin por email
            await sendCatalogProposalNotification(userId, type, value.trim());

            res.json({ success: true, proposalId: proposalRef.id, status: 'pending' });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // =============================================
    // ADMIN — Endpoints de administración (requieren x-admin-token)
    // =============================================

    // Helper de verificación de admin (inline para este bloque)
    const isAdminRequest = (adminToken: string | string[] | undefined): boolean => {
        return adminToken === (ENV.BIOENGINE_ADMIN_TOKEN || 'bioengine-local');
    };

    // GET /api-cloud/admin/catalog/proposals — listar propuestas pendientes
    if (req.method === 'GET' && path === '/admin/catalog/proposals') {
        if (!isAdminRequest(req.headers['x-admin-token'])) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        try {
            const statusFilter = (req.query.status as string) || 'pending';
            const snap = await db.collection('catalog_proposals')
                .where('status', '==', statusFilter)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get()
                .catch(() => db.collection('catalog_proposals').where('status', '==', statusFilter).limit(50).get());
            const proposals = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            res.json({ proposals });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // POST /api-cloud/admin/catalog/approve — aprobar o rechazar propuesta
    if (req.method === 'POST' && path === '/admin/catalog/approve') {
        if (!isAdminRequest(req.headers['x-admin-token'])) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        try {
            const { proposalId, approved } = req.body || {};
            if (!proposalId || typeof approved !== 'boolean') {
                res.status(400).json({ error: 'proposalId y approved (boolean) son requeridos' });
                return;
            }
            const { FieldValue } = await import('firebase-admin/firestore');
            const proposalRef = db.collection('catalog_proposals').doc(proposalId);
            const proposalSnap = await proposalRef.get();
            if (!proposalSnap.exists) {
                res.status(404).json({ error: 'Propuesta no encontrada' });
                return;
            }
            const proposal = proposalSnap.data()!;

            if (approved) {
                // Agregar el ítem al catálogo correspondiente
                const catalogDocId = proposal.type === 'medication' ? 'medications' : 'conditions';
                const catalogRef = db.collection('catalog').doc(catalogDocId);
                await catalogRef.set({
                    items: FieldValue.arrayUnion(proposal.value),
                    updatedAt: FieldValue.serverTimestamp()
                }, { merge: true });
            }

            await proposalRef.update({
                status: approved ? 'approved' : 'rejected',
                resolvedAt: FieldValue.serverTimestamp()
            });

            res.json({ success: true, proposalId, approved });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // POST /api-cloud/admin/catalog/edit — editar catálogo directamente
    if (req.method === 'POST' && path === '/admin/catalog/edit') {
        if (!isAdminRequest(req.headers['x-admin-token'])) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        try {
            const { type, items } = req.body || {};
            if (!type || !Array.isArray(items) || !['medications', 'conditions'].includes(type)) {
                res.status(400).json({ error: 'type (medications|conditions) e items (array) son requeridos' });
                return;
            }
            const { FieldValue } = await import('firebase-admin/firestore');
            await db.collection('catalog').doc(type).set({
                items,
                updatedAt: FieldValue.serverTimestamp()
            });
            res.json({ success: true, type, count: items.length });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // GET /api-cloud/admin/users/pending — listar usuarios con status pending
    if (req.method === 'GET' && path === '/admin/users/pending') {
        if (!isAdminRequest(req.headers['x-admin-token'])) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        try {
            const snap = await db.collection('users')
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get()
                .catch(() => db.collection('users').where('status', '==', 'pending').limit(50).get());
            const users = snap.docs.map((d: any) => ({
                uid: d.id,
                email: d.data().email || '',
                nombre: d.data().nombre || '',
                status: d.data().status || 'pending',
                createdAt: d.data().createdAt || null
            }));
            res.json({ users });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // POST /api-cloud/admin/users/:uid/status — cambiar status de usuario
    const adminUserStatusMatch = path.match(/^\/admin\/users\/([^/]+)\/status$/);
    if (req.method === 'POST' && adminUserStatusMatch) {
        if (!isAdminRequest(req.headers['x-admin-token'])) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        try {
            const targetUid = adminUserStatusMatch[1];
            const { status } = req.body || {};
            if (!status || !['active', 'inactive', 'rejected'].includes(status)) {
                res.status(400).json({ error: 'status debe ser active, inactive o rejected' });
                return;
            }
            const { FieldValue } = await import('firebase-admin/firestore');
            await db.collection('users').doc(targetUid).set({
                status,
                statusUpdatedAt: FieldValue.serverTimestamp()
            }, { merge: true });

            // Notificar al usuario vía Telegram si se activa su cuenta y tiene mapping
            if (status === 'active') {
                try {
                    const mappingSnap = await db.collection('telegram_mappings')
                        .where('webUid', '==', targetUid).limit(1).get()
                        .catch(() => null);

                    let telegramId: string | null = null;
                    if (mappingSnap && !mappingSnap.empty) {
                        telegramId = mappingSnap.docs[0].id;
                    }
                    if (telegramId) {
                        await bot.api.sendMessage(
                            telegramId,
                            `Tu cuenta en BioEngine ha sido activada. Ya puedes acceder al dashboard completo.`
                        );
                    }
                } catch (telegramErr: any) {
                    console.error('[admin/users/status] Error notificando usuario:', telegramErr.message);
                }
            }

            // Notificar al usuario por email si se aprueba o rechaza su cuenta
            if (status === 'active' || status === 'rejected') {
                try {
                    const userSnap = await db.collection('users').doc(targetUid).get();
                    const userData = userSnap.exists ? (userSnap.data() || {}) : {};
                    const userEmail = userData.email || '';
                    const userNombre = userData.nombre || '';
                    await sendUserApprovalNotification(userEmail, status === 'active', userNombre);
                } catch (emailErr: any) {
                    console.error('[admin/users/status] Error enviando email de aprobación:', emailErr.message);
                }
            }

            res.json({ success: true, uid: targetUid, status });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // =============================================
    // CHAT — Endpoints para historial de turnos de conversación
    // =============================================

    // POST /api-cloud/chat/send — crea un nuevo turn en Firestore y procesa la respuesta en background
    if (req.method === 'POST' && path === '/chat/send') {
        try {
            const userId = (req.headers['x-user-id'] as string) || process.env.BIOENGINE_OWNER_UID;
            if (!userId) {
                res.status(400).json({ error: 'x-user-id header requerido' });
                return;
            }
            const message = req.body?.message as string;
            const chatId = req.body?.chatId as string || userId;

            if (!message || !message.trim()) {
                res.status(400).json({ error: 'message is required' });
                return;
            }

            const { createTurn } = await import('./memory/state.js');
            const turnId = await createTurn(chatId, message.trim(), false);

            // Responder inmediatamente al dashboard, sin bloquear.
            // FIX RACE CONDITION: Se elimina el setImmediate que llamaba processTurn directamente.
            // El procesamiento lo maneja exclusivamente processTurnEvent (onDocumentCreated Eventarc).
            // Antes, ambos corrían en paralelo sobre el mismo turn, causando doble procesamiento,
            // escrituras concurrentes en Firestore y respuestas duplicadas al usuario.
            res.json({ success: true, turnId, chatId });
        } catch (e: any) {
            console.error('[chat/send] Error:', e.message);
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // GET /api-cloud/chat/turns — lista los últimos turns de un usuario
    if (req.method === 'GET' && path === '/chat/turns') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const chatId = (req.query.chatId as string) || userId;
            const limitN = Math.min(parseInt((req.query.limit as string) || '20'), 50);

            const snap = await db.collection('chats').doc(chatId).collection('turns')
                .orderBy('createdAt', 'desc')
                .limit(limitN)
                .get()
                .catch(() => db.collection('chats').doc(chatId).collection('turns').limit(limitN).get());

            const turns = snap.docs.map((d: any) => {
                const data = d.data();
                const rawStatus: string = data.status || 'RECEIVED';
                // Normalizar status al formato esperado por iOS
                let status: string;
                if (rawStatus === 'COMPLETED') status = 'completed';
                else if (rawStatus === 'FAILED') status = 'error';
                else status = 'pending';

                return {
                    turnId: d.id,
                    assistantResponse: data.finalResponse || null,
                    status,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || null
                };
            });

            res.json({ turns });
        } catch (e: any) {
            console.error('[chat/turns] Error:', e.message);
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // GET /api-cloud/chat/turns/:turnId — obtiene un turn individual (para polling de status)
    const chatTurnMatch = path.match(/^\/chat\/turns\/([^/]+)$/);
    if (req.method === 'GET' && chatTurnMatch) {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const turnId = chatTurnMatch[1];
            const chatId = (req.query.chatId as string) || userId;

            const doc = await db.collection('chats').doc(chatId).collection('turns').doc(turnId).get();
            if (!doc.exists) {
                res.status(404).json({ error: 'Turn not found' });
                return;
            }

            const data = doc.data()!;
            const rawStatus: string = data.status || 'RECEIVED';
            let status: string;
            if (rawStatus === 'COMPLETED') status = 'completed';
            else if (rawStatus === 'FAILED') status = 'error';
            else status = 'pending';

            res.json({
                turnId: doc.id,
                userMessage: data.userMessage || '',
                assistantResponse: data.finalResponse || null,
                status,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null
            });
        } catch (e: any) {
            console.error('[chat/turns/:id] Error:', e.message);
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // PUT /api-cloud/secrets/update — actualiza un secret en Google Cloud Secret Manager
    if (req.method === 'PUT' && path === '/secrets/update') {
        if (!isAdmin) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const UPDATABLE_SECRETS = [
            'GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY',
            'ELEVENLABS_API_KEY', 'TELEGRAM_BOT_TOKEN', 'BIOENGINE_ADMIN_TOKEN',
            'GARMIN_USERNAME', 'GARMIN_PASSWORD',
            'WITHINGS_ACCESS_TOKEN', 'WITHINGS_REFRESH_TOKEN',
            'WITHINGS_CLIENT_ID', 'WITHINGS_CLIENT_SECRET'
        ];
        const { secretName, secretValue } = req.body || {};
        if (!secretName || !secretValue) {
            res.status(400).json({ error: 'secretName y secretValue son requeridos' });
            return;
        }
        if (!UPDATABLE_SECRETS.includes(secretName)) {
            res.status(400).json({ error: `Secret '${secretName}' no está en la whitelist de actualizables` });
            return;
        }
        try {
            const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
            const smClient = new SecretManagerServiceClient();
            const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'bioengine-v4';
            const secretPath = `projects/${projectId}/secrets/${secretName}`;
            const [version] = await smClient.addSecretVersion({
                parent: secretPath,
                payload: { data: Buffer.from(secretValue, 'utf8') }
            });
            const versionName = version.name?.split('/').pop() || 'unknown';
            res.json({ success: true, secretName, version: versionName });
        } catch (e: any) {
            console.error('[secrets/update] Error:', e.message);
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // =============================================
    // EQUIPMENT / GEAR TRACKING (ítem #15)
    // =============================================

    // GET /api-cloud/equipment — lista el equipamiento activo del usuario
    if (req.method === 'GET' && path === '/equipment') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const { getEquipment, calcEquipmentKm, createHitlAction, getHitlActions } = await import('./memory/db.js');
            const equipment = await getEquipment(userId);

            // Enriquecer cada item con km_usados:
            // - Garmin (fuente == 'garmin' y km_totales > 0): usar km_totales directamente (dato oficial de Garmin)
            // - Manual o sin fuente: calcular desde actividades Garmin
            const enriched = await Promise.all(equipment.map(async (item: any) => {
                let km_usados: number;
                if (item.fuente === 'garmin' && (item.km_totales ?? 0) > 0) {
                    km_usados = item.km_totales;
                } else {
                    km_usados = await calcEquipmentKm(userId, item.tipo, item.fecha_inicio);
                }
                const enrichedItem = { ...item, km_usados };

                // Fix 3 — Alerta HITL si desgaste > 85%
                if (item.vida_util_km && item.vida_util_km > 0) {
                    const pct = km_usados / item.vida_util_km;
                    if (pct > 0.85) {
                        // Evitar duplicados: verificar si ya existe acción pendiente para este equipo
                        (async () => {
                            try {
                                const existentes = await getHitlActions(userId, 'pendiente');
                                const yaExiste = existentes.some((a: any) => a.payload?.equipmentId === item.id);
                                if (!yaExiste) {
                                    await createHitlAction(
                                        userId,
                                        'equipo_proximo_limite',
                                        `El equipo "${item.nombre}" está al ${Math.round(pct * 100)}% de su vida útil (${km_usados}/${item.vida_util_km} km)`,
                                        { equipmentId: item.id, nombre: item.nombre, km_usados, vida_util_km: item.vida_util_km }
                                    );
                                }
                            } catch (alertErr: any) {
                                console.warn('[equipment GET] Error creando HITL alert:', alertErr.message);
                            }
                        })();
                    }
                }

                return enrichedItem;
            }));

            res.json({ equipment: enriched });
        } catch (e: any) {
            console.error('[equipment GET] Error:', e);
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // POST /api-cloud/equipment — crea un nuevo item de equipamiento
    if (req.method === 'POST' && path === '/equipment') {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const { nombre, tipo, km_totales, fecha_inicio, notas, vida_util_km } = req.body || {};
            if (!nombre) { res.status(400).json({ error: 'Campo nombre es requerido' }); return; }
            if (!tipo) { res.status(400).json({ error: 'Campo tipo es requerido' }); return; }
            if (!fecha_inicio) { res.status(400).json({ error: 'Campo fecha_inicio es requerido' }); return; }
            const VALID_TYPES = ['zapatillas_running', 'zapatillas_tenis', 'bicicleta', 'raqueta', 'otro'];
            if (!VALID_TYPES.includes(tipo)) {
                res.status(400).json({ error: `tipo debe ser uno de: ${VALID_TYPES.join(', ')}` });
                return;
            }
            const { saveEquipment } = await import('./memory/db.js');
            const equipmentData: any = {
                nombre,
                tipo,
                km_totales: Number(km_totales) || 0,
                fecha_inicio,
                activo: true,
                notas: notas || ''
            };
            if (vida_util_km !== undefined && vida_util_km !== null) {
                equipmentData.vida_util_km = Number(vida_util_km);
            }
            const id = await saveEquipment(userId, equipmentData);
            res.json({ success: true, id });
        } catch (e: any) {
            console.error('[equipment POST] Error:', e);
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // PUT /api-cloud/equipment/:id/km — suma km al total del item
    const equipmentKmMatch = path.match(/^\/equipment\/([^/]+)\/km$/);
    if (req.method === 'PUT' && equipmentKmMatch) {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const equipmentId = equipmentKmMatch[1];
            const km = Number(req.body?.km);
            if (!km || km <= 0) { res.status(400).json({ error: 'Campo km debe ser un número positivo' }); return; }
            const { updateEquipmentKm } = await import('./memory/db.js');
            await updateEquipmentKm(userId, equipmentId, km);
            res.json({ success: true });
        } catch (e: any) {
            console.error('[equipment PUT km] Error:', e);
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // DELETE /api-cloud/equipment/:id — desactiva el item (soft delete)
    const equipmentDeleteMatch = path.match(/^\/equipment\/([^/]+)$/);
    if (req.method === 'DELETE' && equipmentDeleteMatch) {
        try {
            const userId = req.headers['x-user-id'] as string;
            if (!userId) { res.status(401).json({ error: 'X-User-Id header requerido' }); return; }
            const equipmentId = equipmentDeleteMatch[1];
            const { deactivateEquipment } = await import('./memory/db.js');
            await deactivateEquipment(userId, equipmentId);
            res.json({ success: true });
        } catch (e: any) {
            console.error('[equipment DELETE] Error:', e);
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // Safety fallback for API calls to prevent HTML fallthrough (fixes "Unexpected token <" error)
    if (rawPath.startsWith('/api-cloud/')) {
        res.status(404).json({
            error: `Endpoint ${path} not implemented on Proxy`,
            path: rawPath,
            timestamp: new Date().toISOString()
        });
        return;
    }

    // Default to Telegram Webhook
    const finalBot = getBot();
    if (!finalBot.token) {
        console.error("[Webhook] Fatality: Bot token is empty in getBot().");
        res.status(500).send("Bot token missing");
        return;
    }
    return webhookCallback(finalBot, 'express')(req, res);
});

// Tarea programada: Sincronización de Salud (Garmin/Withings)
// Se ejecuta cada 4 horas entre las 8:00 y las 22:00
// En arquitectura cloud-native, este cron genera análisis del coach y alertas proactivas.
export const scheduledHealthSync = onSchedule({
    schedule: '0 8,12,16,20 * * *',
    timeZone: ENV.GOG_TIMEZONE || 'UTC',
    memory: '512MiB',
    timeoutSeconds: 300,
    secrets: [secretTelegramToken, secretGeminiKey, secretGroqKey, secretOpenrouterKey, secretElevenlabsKey]
}, async (_event) => {
    await ensureReady();
    const logger = getLogger('SCHEDULE_SYNC', 'SYSTEM');
    logger.info('Cron activado: Generando análisis del coach y verificando alertas...');

    try {
        // Obtener todos los usuarios activos con Garmin o Withings conectados
        const usersSnap = await db.collection('users')
            .where('status', '==', 'active')
            .get()
            .catch(() => db.collection('users').get()); // fallback sin filtro si no hay índice aún

        const OWNER_UID = process.env.BIOENGINE_OWNER_UID;

        // Siempre incluir al owner aunque no tenga status field
        const userIds = new Set<string>(OWNER_UID ? [OWNER_UID] : []);
        for (const doc of usersSnap.docs) {
            const data = doc.data();
            const status = data.status;
            // Incluir si: es el owner, tiene status 'active', o no tiene status (backcompat)
            if (!status || status === 'active') {
                userIds.add(doc.id);
            }
        }

        logger.info(`[Sync] Sincronizando ${userIds.size} usuario(s): ${[...userIds].join(', ')}`);

        // Sincronizar cada usuario (sequentially para no saturar las APIs externas)
        for (const userId of userIds) {
            try {
                logger.info(`[Sync] → ${userId}: iniciando Garmin + Withings`);
                const [garminResult, withingsResult] = await Promise.allSettled([
                    syncGarmin(userId),
                    syncWithings(userId)
                ]);
                logger.info(`[Sync] → ${userId}: Garmin=${garminResult.status} Withings=${withingsResult.status}`);

                // Generar análisis del coach solo para el owner (para no consumir LLM por cada usuario)
                if (userId === OWNER_UID) {
                    const analysis = await generateCoachAnalysis(userId);
                    logger.info(`[Sync] → ${userId}: Coach analysis estado_forma=${analysis?.estado_forma || 'N/A'}`);
                }
            } catch (userErr: any) {
                logger.error(`[Sync] → ${userId}: Error: ${userErr.message}`);
                // Continuar con el siguiente usuario
            }
        }

        // Revisar y enviar alertas proactivas vía Telegram (por cada usuario sincronizado)
        for (const userId of userIds) {
            await checkAndSendAlerts(userId);
        }
        logger.info('[Sync] Alertas verificadas y enviadas.');
    } catch (e: any) {
        logger.error(`[Sync] Error en cron: ${e.message}`);
    }
});

// Health Heartbeat for SRE Monitoring
export const health = onRequest({ invoker: 'public', secrets: [secretTelegramToken, secretGeminiKey, secretGroqKey, secretOpenrouterKey, secretElevenlabsKey] }, async (req, res) => {
    await ensureReady();
    res.status(200).send({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'OpenGravity-V4',
        environment: process.env.K_SERVICE ? 'production' : 'development'
    });
});

// Background Worker powered by Firebase Eventarc
export const processTurnEvent = onDocumentCreated(
    {
        document: 'chats/{chatId}/turns/{turnId}',
        timeoutSeconds: 540, // 9 minutes background CPU time
        memory: '1GiB',
        secrets: [secretTelegramToken, secretGeminiKey, secretGroqKey, secretOpenrouterKey, secretElevenlabsKey]
    },
    async (event) => {
        await ensureReady();
        const snapshot = event.data;
        if (!snapshot) return;

        const chatId = event.params.chatId;
        const turnId = event.params.turnId;
        const data = snapshot.data();

        // V4.11: Debug Trace for Session ID (Entry Point)
        try {
            await db.collection('debug_sessions').doc('last').set({
                chatId,
                turnId,
                triggeredAt: admin.firestore.Timestamp.now(),
                status: data.status
            }, { merge: true });
        } catch (e) {
            console.error("Debug trace write failed:", e);
        }

        const logger = getLogger(turnId, chatId);
        logger.info(`[Eventarc] Triggered for turnId=${turnId} in chatId=${chatId}, status=${data.status}`, {
            chatId,
            turnId,
            status: data.status,
            documentPath: `chats/${chatId}/turns/${turnId}`
        });

        // We only trigger processTurn if it's RECEIVED (fresh)
        // Subsequent processing inside the same turn might happen synchronously or via other loops
        if (data.status !== 'RECEIVED') return;

        // Let the worker do its job synchronously here
        try {
            const result: any = await processTurn(chatId, turnId);

            // Si el worker responde, aquí mandamos el msg por Telegram (en background, sin throttling)
            if (result) {
                const isTelegramChat = /^\d+$/.test(chatId);
                let finalFormattedText = result.text || "Hecho.";
                
                // Si fue voz, prefijamos lo que el usuario dijo para que no se pierda al editar
                if (data.wasVoiceRequest && data.userMessage) {
                    finalFormattedText = `🎯 *Tú dijiste:* _"${data.userMessage}"_\n\n${finalFormattedText}`;
                }

                // SOLO enviamos a Telegram si el chatId parece numérico (ID de Telegram)
                if (isTelegramChat) {
                    // Intentamos EDITAR el statusMsg para transformarlo en la respuesta.
                    if (data.telegramMessageId && result.text && !result.media && !result.voiceBuffer) {
                        await bot.api.editMessageText(chatId, data.telegramMessageId, finalFormattedText, { 
                            parse_mode: 'Markdown' 
                        }).catch(async (err) => {
                            // Si falla (ej: por markdown), mandamos uno nuevo y borramos el viejo
                            logger.warn(`[Eventarc] Failed to edit statusMsg: ${err.message}. Retrying via new message.`);
                            await bot.api.deleteMessage(chatId, data.telegramMessageId).catch(() => { });
                            await sendSplitMessage({ reply: (msg: string, opt: any) => bot.api.sendMessage(chatId, msg, opt) } as any, finalFormattedText);
                        });
                    } else {
                        // Si hay media o voz, primero borramos el "Analizando..." y luego mandamos todo limpio
                        if (data.telegramMessageId) {
                            await bot.api.deleteMessage(chatId, data.telegramMessageId).catch(() => { });
                        }

                        if (result.media) {
                            const { type, url, caption } = result.media;
                            if (type === 'image') {
                                await bot.api.sendPhoto(chatId, url, { caption: caption ? `💡 *Tip:* ${caption}` : undefined, parse_mode: 'Markdown' }).catch(() => { });
                            } else if (type === 'video') {
                                await bot.api.sendVideo(chatId, url, { caption: caption ? `📺 *Video:* ${caption}` : undefined, parse_mode: 'Markdown' }).catch(() => { });
                            }
                        }

                        if (result.text) {
                            await sendSplitMessage({ reply: (msg: string, opt: any) => bot.api.sendMessage(chatId, msg, opt) } as any, finalFormattedText);
                        }
                        
                        if (result.voiceBuffer) {
                            await bot.api.sendChatAction(chatId, 'upload_voice').catch(() => { });
                            await bot.api.sendVoice(chatId, new InputFile(result.voiceBuffer, 'response.ogg')).catch(() => { });
                        }
                    }
                } else {
                    logger.info(`[Eventarc] Turn ${turnId} completed for Web/API (chatId=${chatId}). Skipping Telegram delivery.`);
                }

                // Sync to Firebase Storage for the Dashboard playback (independientemente si es Telegram o Web)
                if (result.voiceBuffer) {
                    try {
                        const bucket = storage.bucket();
                        const fileName = `chats/${chatId}/turns/${turnId}/response.ogg`;
                        const file = bucket.file(fileName);
                        
                        await file.save(result.voiceBuffer, {
                            metadata: { contentType: 'audio/ogg' },
                            public: true
                        });

                            // Generate a simple public URL for the dashboard
                            // Since the bucket isn't public by default, we use the storage.googleapis.com format
                            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                            await saveVoiceUrl(chatId, turnId, publicUrl);
                            
                            logger.info(`[Eventarc] Voice response synced for turnId=${turnId}`);
                        } catch (storageError: any) {
                            logger.error(`[Eventarc] Failed to sync voice to storage: ${storageError.message}`);
                        }
                }
            }
        } catch (e: any) {
            console.error(`[Eventarc] Async worker crash for turn ${turnId}:`, e);
            if (data.telegramMessageId) {
                await bot.api.editMessageText(chatId, data.telegramMessageId, `⚠️ *Error de Fondo:* ${e.message}`, { parse_mode: 'Markdown' }).catch(() => { });
            }
        }
    }
);

// Entry point for local development
const isLocal = process.env.NODE_ENV !== 'production' && !process.env.K_SERVICE && !process.env.FUNCTIONS_EMULATOR;
console.log("Checking environment: isLocal=", isLocal, "argv[1]=", process.argv[1]);
// Only run bootstrap if this file is the one being executed directly
if (isLocal && (process.argv[1]?.includes('index.ts') || process.argv[1]?.includes('index.js'))) {
    async function bootstrap() {
        console.log("Starting OpenGravity locally...");
        try {
            await ensureReady();
            console.log("Starting Telegram Bot long pulling...");
            await bot.api.deleteWebhook({ drop_pending_updates: true }).catch(() => { });
            
            // Check alerts on startup (solo si el owner está configurado)
            const ownerUidForAlerts = process.env.BIOENGINE_OWNER_UID;
            if (ownerUidForAlerts) {
                checkAndSendAlerts(ownerUidForAlerts).catch(e => console.error("Error on startup alert check:", e));

                // Periodic alert check (every 30 minutes)
                setInterval(() => {
                    checkAndSendAlerts(ownerUidForAlerts).catch(e => console.error("Error on periodic alert check:", e));
                }, 30 * 60 * 1000);
            }

            await bot.start({
                onStart: (botInfo) => {
                    console.log(`Conectado exitosamente como @${botInfo.username}`);
                }
            });
        } catch (error) {
            console.error("Failed to start OpenGravity locally:", error);
            process.exit(1);
        }
    }
    bootstrap();
}
