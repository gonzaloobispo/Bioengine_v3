import { InlineKeyboard } from 'grammy';
import { ENV } from '../config.js';
import { db } from '../memory/db.js';
import { bot, sendSplitMessageToChatId } from './telegram.js';
import { log } from '../utils/logger.js';

interface BioAlert {
    id: string;
    level: 'info' | 'warning' | 'danger';
    title: string;
    message: string;
    cooldown_hours?: number; // Metadatos opcionales desde backend
}

/**
 * Fallback configuration for alert cooldowns.
 */
const ALERT_COOLDOWN: Record<string, number> = {
    'overreach': 12,        // Danger: Check every half-day
    'sleep': 24,            // Warning: Daily reminder
    'monotony': 48,         // Warning: Two-day cycle
    'plateau': 168,         // Info: Weekly insight (24*7)
    'med_atenolol': 720     // Info: Monthly clinical check (24*30)
};

const DEFAULT_COOLDOWN = 24; 

// Cache en memoria para resiliencia si Firestore falla
const localCooldownCache = new Map<string, number>();

// Contador de fallos para Heartbeat
let apiFailCount = 0;

/**
 * BLOQUE 3C: Verifica si el usuario tiene el modo silencio activo.
 */
async function isUserPaused(chatId: string): Promise<boolean> {
    if (!db) return false;
    try {
        const doc = await db.collection('user_settings').doc(chatId).get();
        if (!doc.exists) return false;
        
        const data = doc.data();
        if (!data?.pausedUntil) return false;
        
        const pausedUntil = new Date(data.pausedUntil).getTime();
        const now = new Date().getTime();
        
        return now < pausedUntil;
    } catch (e: any) {
        log.error(`Error verificando pausa para ${chatId}: ${e.message}`);
        return false;
    }
}

/**
 * Obtiene todas las alertas enviadas para un usuario en una sola consulta. (Batching)
 */
async function getSentAlertsForUser(chatId: string): Promise<Record<string, number>> {
    const sentAlerts: Record<string, number> = {};
    
    // 1. Cargar desde la caché local primero (Resiliencia)
    for (const [key, timestamp] of localCooldownCache.entries()) {
        if (key.startsWith(`${chatId}_`)) {
            const alertId = key.split('_').slice(1).join('_');
            sentAlerts[alertId] = timestamp;
        }
    }

    // 2. Intentar cargar desde Firestore para sincronizar
    if (db) {
        try {
            const snapshot = await db.collection('sent_alerts')
                .where('chatId', '==', chatId)
                .get();
            
            snapshot.forEach((doc: any) => {
                const data = doc.data();
                if (data.alertId && data.sentAt) {
                    const ts = new Date(data.sentAt).getTime();
                    // Solo actualizamos si Firestore tiene datos más recientes
                    if (!sentAlerts[data.alertId] || ts > sentAlerts[data.alertId]) {
                        sentAlerts[data.alertId] = ts;
                        localCooldownCache.set(`${chatId}_${data.alertId}`, ts);
                    }
                }
            });
        } catch (error: any) {
            log.warn(`Falló lectura de Firestore para usuario ${chatId}, usando modo Resiliencia Local: ${error.message}`);
        }
    }

    return sentAlerts;
}

/**
 * Checks if an alert has been sent within its cooldown window.
 */
function isWithinCooldown(alert: BioAlert, chatId: string, userHistory: Record<string, number>): boolean {
    const lastSentAt = userHistory[alert.id];
    if (!lastSentAt) return false;
    
    const now = new Date().getTime();
    
    // Prioridad: 1. Metadata del backend, 2. Mapeo local, 3. Default
    const cooldownHours = alert.cooldown_hours || ALERT_COOLDOWN[alert.id] || DEFAULT_COOLDOWN;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    
    return (now - lastSentAt) < cooldownMs;
}

/**
 * Marks an alert as sent in both Memory Cache and Firestore.
 */
async function markAlertAsSent(alertId: string, chatId: string): Promise<void> {
    const now = new Date();
    const docId = `${chatId}_${alertId}`;
    
    // 1. Actualizar memoria inmediatamente
    localCooldownCache.set(docId, now.getTime());
    
    // 2. Intentar persistencia en Firestore
    if (db) {
        try {
            await db.collection('sent_alerts').doc(docId).set({
                alertId,
                chatId,
                sentAt: now.toISOString(),
                readAt: null // Inicializar para Bloque 3C
            });
        } catch (error: any) {
            log.error(`Fallo crítico al persistir en Firestore alert ${alertId}: ${error.message}. El estado queda vivo solo en memoria.`);
        }
    }
}

/**
 * Maps alert levels to emojis and formatting.
 */
function formatAlert(alert: BioAlert): string {
    const levelEmojis: Record<string, string> = {
        danger: '🚨 *PELIGRO CRÍTICO*',
        warning: '⚠️ *ADVERTENCIA*',
        info: 'ℹ️ *INFO CLÍNICA*'
    };
    
    const emoji = levelEmojis[alert.level] || '🔔';
    return `${emoji}: ${alert.title.toUpperCase()}\n\n${alert.message}`;
}

/**
 * BLOQUE 3C: Crea teclado interactivo para la alerta.
 */
function createAlertKeyboard(alert: BioAlert): InlineKeyboard {
    const keyboard = new InlineKeyboard()
        .text("✅ Entendido", `read_${alert.id}`)
        .url("📊 Ver Dashboard", ENV.BIOENGINE_DASHBOARD_URL);
    return keyboard;
}

/**
 * Calcula el ACWR simple desde actividades recientes.
 * Duplicado local para no crear dependencia circular con plans.ts.
 */
function calcACWRLocal(activities: any[]): { acute: number; chronic: number; ratio: number } {
    const now = Date.now();
    const MS_DAY = 86400000;

    const getLoad = (a: any): number => {
        if (a.training_load && Number(a.training_load) > 0) return Number(a.training_load) * 20;
        const durationH = (Number(a.duration_min) || 30) / 60;
        const hr = Number(a.avg_heart_rate || a.avg_hr) || 130;
        return durationH * (hr / 150) * 100;
    };
    const getTime = (a: any): number => {
        if (a.timestamp?.toMillis) return a.timestamp.toMillis();
        if (a.start_time?.toDate) return a.start_time.toDate().getTime();
        if (a.date) return new Date(a.date).getTime();
        return 0;
    };

    const acuteArr = activities.filter(a => now - getTime(a) <= 7 * MS_DAY);
    const chronicArr = activities.filter(a => now - getTime(a) <= 28 * MS_DAY);
    const acute = acuteArr.reduce((s, a) => s + getLoad(a), 0) / 7;
    const chronic = chronicArr.reduce((s, a) => s + getLoad(a), 0) / 28;
    return { acute: +acute.toFixed(1), chronic: +chronic.toFixed(1), ratio: chronic > 0 ? +(acute / chronic).toFixed(2) : 1.0 };
}

/**
 * Genera alertas de entrenamiento desde Firestore (nativo cloud, sin backend Python).
 * @param userId — ID del usuario (requerido)
 */
async function fetchAlertsFromFirestore(userId: string): Promise<BioAlert[]> {
    try {
        const userRef = db.collection('users').doc(userId);

        // Leer salud y actividades en paralelo
        const [healthSnap, actSnap] = await Promise.all([
            userRef.collection('daily_health')
                .orderBy('updatedAt', 'desc').limit(7).get()
                .catch(() => userRef.collection('daily_health').limit(7).get()),
            userRef.collection('activities')
                .orderBy('start_time', 'desc').limit(50).get()
                .catch(() => userRef.collection('activities').limit(50).get())
        ]);

        if (healthSnap.empty) return [];

        const health = healthSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        const activities = actSnap.docs.map((d: any) => d.data());
        const latest = health[0];
        const alerts: BioAlert[] = [];

        // ── HRV ─────────────────────────────────────────────────────────
        const hrv = Number(latest.hrv_value || latest.hrv || latest.hrv_ms || 0);
        const restingHr = Number(latest.resting_hr || latest.fc_reposo || 0);
        const sleepH = Number(latest.sleep_hours || latest.sueno_horas || 0);
        const readiness = Number(latest.readiness_score || 0);

        if (hrv > 0 && hrv < 25) {
            alerts.push({ id: 'overreach', level: 'danger', title: 'HRV Crítico', message: `HRV = ${hrv}ms. Riesgo de sobreentrenamiento — descansa hoy.`, cooldown_hours: 12 });
        } else if (hrv > 0 && hrv < 35) {
            alerts.push({ id: 'hrv_low', level: 'warning', title: 'HRV Bajo', message: `HRV = ${hrv}ms. Prioriza recuperación activa.`, cooldown_hours: 24 });
        }

        // ── HRV: caída >15% vs promedio de 7 días ───────────────────────
        if (hrv > 0 && health.length >= 3) {
            const past7 = health.slice(1).map((h: any) => Number(h.hrv_value || h.hrv || h.hrv_ms || 0)).filter((v: number) => v > 0);
            if (past7.length >= 2) {
                const avg7 = past7.reduce((s: number, v: number) => s + v, 0) / past7.length;
                const dropPct = avg7 > 0 ? (avg7 - hrv) / avg7 : 0;
                if (dropPct >= 0.15) {
                    const dropPctStr = Math.round(dropPct * 100);
                    const avg7Str = avg7.toFixed(0);
                    alerts.push({
                        id: 'hrv_drop',
                        level: 'warning',
                        title: 'Caída de HRV',
                        message: `HRV cayó ${dropPctStr}% vs tu promedio (${avg7Str}ms → ${hrv}ms). Prioriza recuperación hoy.`,
                        cooldown_hours: 24
                    });
                }
            }
        }

        if (restingHr > 70) {
            alerts.push({ id: 'hr_elevated', level: 'warning', title: 'FC Reposo Elevada', message: `FC reposo = ${restingHr}bpm. Posible fatiga acumulada.`, cooldown_hours: 24 });
        }

        if (sleepH > 0 && sleepH < 6) {
            alerts.push({ id: 'sleep', level: 'warning', title: 'Sueño Insuficiente', message: `Solo ${sleepH}h de sueño. Impacto en recuperación y rendimiento.`, cooldown_hours: 24 });
        }

        if (readiness > 0 && readiness < 40) {
            alerts.push({ id: 'readiness_low', level: 'warning', title: 'Readiness Bajo', message: `Readiness = ${readiness}/100. Hoy no es día de entrenamiento intenso.`, cooldown_hours: 24 });
        }

        // ── ACWR ─────────────────────────────────────────────────────────
        if (activities.length > 0) {
            const { acute, chronic, ratio } = calcACWRLocal(activities);
            if (ratio > 1.5) {
                alerts.push({
                    id: 'acwr_danger',
                    level: 'danger',
                    title: 'ACWR Peligroso',
                    message: `ACWR = ${ratio} — riesgo alto de lesión. Reduce carga inmediatamente. Agudo: ${acute} UA, Crónico: ${chronic} UA.`,
                    cooldown_hours: 12
                });
            } else if (ratio > 1.3) {
                alerts.push({
                    id: 'acwr_high',
                    level: 'warning',
                    title: 'ACWR Alto',
                    message: `ACWR alto (${ratio}) — considera reducir carga hoy. Agudo: ${acute} UA, Crónico: ${chronic} UA.`,
                    cooldown_hours: 24
                });
            }
        }

        return alerts;
    } catch (e: any) {
        log.warn(`[Alerts] Firestore query falló: ${e.message}`);
        return [];
    }
}

/**
 * Periodic task to check for new alerts from BioEngine Intelligence.
 * @param userId — ID del usuario (requerido)
 */
export async function checkAndSendAlerts(userId: string): Promise<void> {
    try {
        log.info('Checking for proactive alerts from Firestore (Cloud-native)...');

        const targetUserId = userId;
        const rawAlerts: BioAlert[] = await fetchAlertsFromFirestore(targetUserId);
        apiFailCount = 0;
        
        if (rawAlerts.length === 0) {
            log.info('No active alerts in BioEngine.');
            return;
        }

        const priorityScore = { danger: 3, warning: 2, info: 1 };
        const alerts = [...rawAlerts].sort((a, b) => 
            (priorityScore[b.level] || 0) - (priorityScore[a.level] || 0)
        );

        // 3. Loop through allowed users
        for (const chatId of ENV.TELEGRAM_ALLOWED_USER_IDS) {
            // BLOQUE 3C: Check if user is paused
            if (await isUserPaused(chatId)) {
                log.info(`User ${chatId} is in Mute Mode. Skipping alerts.`);
                continue;
            }

            const userHistory = await getSentAlertsForUser(chatId);
            
            for (const alert of alerts) {
                if (isWithinCooldown(alert, chatId, userHistory)) {
                    log.info(`Alert ${alert.id} skipped for user ${chatId}`);
                    continue;
                }

                log.info(`Sending alert ${alert.id} to user ${chatId}`);
                const formatted = formatAlert(alert);
                const keyboard = createAlertKeyboard(alert);
                
                await sendSplitMessageToChatId(chatId, formatted, { 
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
                
                await markAlertAsSent(alert.id, chatId);
            }
        }
        
    } catch (error: any) {
        log.error('Error checking BioEngine alerts:', error.message);
    }
}
