import { Bot, InputFile, Context, InlineKeyboard } from 'grammy';
import { ENV } from '../config.js';
import { transcribeAudio } from '../agent/llm.js';
import { processTurn } from '../agent/worker.js';
import { isUpdateProcessed, markUpdateProcessed, db } from '../memory/db.js';
import { createTurn } from '../memory/state.js';
import { getRecentLogs } from './monitor.js';
import { getLogger, log } from '../utils/logger.js';

// Lazy initialization: TELEGRAM_BOT_TOKEN comes from Secret Manager at runtime.
// During Firebase deploy analysis (local), the token is absent — use a no-op stub
// so the CLI can discover exported functions without crashing.
let _bot: Bot | null = null;
let _stub: any = null;

function makeStub(): any {
    const noop = () => makeStub();
    return new Proxy(noop, {
        get: () => makeStub(),
        apply: () => makeStub(),
    });
}

export function getBot(): Bot {
    if (!_bot) {
        const token = process.env.TELEGRAM_BOT_TOKEN || ENV.TELEGRAM_BOT_TOKEN;
        if (!token) {
            // Analysis phase: return silent stub so Firebase CLI can discover exports
            if (!_stub) _stub = makeStub();
            return _stub as unknown as Bot;
        }
        log.info("[Bot] Initializing real instance with token...");
        _bot = new Bot(token);
        registerHandlers(_bot);
    }
    return _bot;
}

// Backwards-compat: all existing code uses `bot.use(...)`, `bot.on(...)` etc.
// The Proxy forwards calls to the lazy singleton.
export const bot = new Proxy({} as Bot, {
    get(_target, prop) {
        return (getBot() as any)[prop];
    }
});


/**
 * Splits a long text into multiple messages to respect Telegram's 4096 char limit.
 */
export async function sendSplitMessage(ctx: any, text: string, options?: any) {
    const MAX_LENGTH = 4000;
    if (text.length <= MAX_LENGTH) {
        try {
            await ctx.reply(text, options);
        } catch (e: any) {
            console.error("Markdown failed, retrying plain text:", e.message);
            const safeOptions = { ...options };
            delete safeOptions.parse_mode;
            await ctx.reply(text, safeOptions).catch((err2: any) => {
                console.error("Ultimate failure sending message:", err2.message);
            });
        }
        return;
    }

    const chunks = [];
    let currentChunk = '';
    const lines = text.split('\n');

    for (const line of lines) {
        if (currentChunk.length + line.length + 1 > MAX_LENGTH) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = '';
            }
            let remainingLine = line;
            while (remainingLine.length > MAX_LENGTH) {
                chunks.push(remainingLine.slice(0, MAX_LENGTH));
                remainingLine = remainingLine.slice(MAX_LENGTH);
            }
            if (remainingLine.length > 0) {
                currentChunk = remainingLine + '\n';
            }
        } else {
            currentChunk += line + '\n';
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    for (const chunk of chunks) {
        if (chunk.trim().length > 0) {
            try {
                // Remove parse_mode if we are splitting to avoid broken markdown tags
                const safeOptions = { ...options };
                delete safeOptions.parse_mode;
                await ctx.reply(chunk.trim(), safeOptions);
            } catch (e: any) {
                console.error("Failed to send chunk:", e.message);
                // Fallback attempt without any special options
                await ctx.reply(chunk.trim());
            }
        }
    }
}

export async function sendSplitMessageToChatId(chatId: string, text: string, options?: any) {
    const MAX_LENGTH = 4000;
    if (text.length <= MAX_LENGTH) {
        await bot.api.sendMessage(chatId, text, options);
        return;
    }

    const chunks = [];
    let currentChunk = '';
    const lines = text.split('\n');

    for (const line of lines) {
        if (currentChunk.length + line.length + 1 > MAX_LENGTH) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = '';
            }
            let remainingLine = line;
            while (remainingLine.length > MAX_LENGTH) {
                chunks.push(remainingLine.slice(0, MAX_LENGTH));
                remainingLine = remainingLine.slice(MAX_LENGTH);
            }
            if (remainingLine.length > 0) {
                currentChunk = remainingLine + '\n';
            }
        } else {
            currentChunk += line + '\n';
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    for (const chunk of chunks) {
        if (chunk.trim().length > 0) {
            try {
                const safeOptions = { ...options };
                delete safeOptions.parse_mode;
                await bot.api.sendMessage(chatId, chunk.trim(), safeOptions);
            } catch (e: any) {
                console.error("Failed to send chunk:", e.message);
                await bot.api.sendMessage(chatId, chunk.trim());
            }
        }
    }
}

function registerHandlers(b: Bot) {
    // Middleware to check user whitelist and stop duplicates
    b.use(async (ctx, next) => {
        const updateId = ctx.update.update_id;

        if (!updateId) {
            return;
        }

        // V4.5: Distributed Locking in Firestore - This prevents the "4-minute lag" 
        // by ensuring multiple Cloud Function instances don't process the same message.
        const isNew = await markUpdateProcessed(updateId);
        if (!isNew) {
            log.warn(`[Lock] Update ${updateId} is already being processed or finished. Skipping retry.`);
            return;
        }

        const userId = ctx.from?.id.toString();
        if (!userId) {
            return;
        }

        if (!ENV.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
            await ctx.reply("Unauthorized.");
            return;
        }

        await next();
    });

    b.command('start', async (ctx) => {
        const telegramId = ctx.from?.id?.toString();
        if (telegramId && db) {
            // Auto-register mapping: for single-user setup, map to configured UID
            // In multi-user FASE 2 this will use OAuth/token flow instead
            const OWNER_TELEGRAM_ID = process.env.TELEGRAM_ALLOWED_USER_IDS?.split(',')[0]?.trim();
            const OWNER_UID = process.env.BIOENGINE_OWNER_UID;
            if (telegramId === OWNER_TELEGRAM_ID && OWNER_UID) {
                const { FieldValue } = await import('firebase-admin/firestore');
                await db.collection('telegram_mappings').doc(telegramId).set({
                    webUid: OWNER_UID,
                    updatedAt: FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }
        ctx.reply("Hello! I am OpenGravity. Ready to assist you.\n\nComandos UX Alertas:\n/pause [h] - Silencia alertas (por defecto 8h)\n/resume - Reactiva alertas");
    });

    /**
     * BLOQUE 3C: Comando de Pausa Temporal
     */
    b.command('pause', async (ctx) => {
        const args = ctx.match?.split(' ') || [];
        const hours = parseInt(args[0]) || 8;
        const until = new Date(Date.now() + hours * 60 * 60 * 1000);
        
        if (db) {
            await db.collection('user_settings').doc(ctx.from?.id.toString() || '').set({
                pausedUntil: until.toISOString()
            }, { merge: true });
        }
        
        await ctx.reply(`🔕 *Modo Silencio Activado*: No recibirás alertas proactivas durante las próximas ${hours} horas (hasta ${until.toLocaleTimeString()}).`, { parse_mode: 'Markdown' });
    });

    b.command('resume', async (ctx) => {
        if (db) {
            await db.collection('user_settings').doc(ctx.from?.id.toString() || '').set({
                pausedUntil: null
            }, { merge: true });
        }
        await ctx.reply("🔔 *Alertas Reactivadas*: Volverás a recibir notificaciones proactivas de BioEngine.", { parse_mode: 'Markdown' });
    });

    b.command('sync', async (ctx) => {
        const telegramId = ctx.from?.id.toString();
        await ctx.reply("🔄 Iniciando sincronización con Garmin y Withings...");
        try {
            const { syncGarmin, syncWithings } = await import('../services/health_sync.js');
            const OWNER_UID = process.env.BIOENGINE_OWNER_UID;
            let userId = OWNER_UID || '';
            if (telegramId && db) {
                const mapSnap = await db.collection('telegram_mappings').doc(telegramId).get();
                if (mapSnap.exists) userId = mapSnap.data()?.webUid || userId;
            }
            if (!userId) {
                await ctx.reply("❌ No se pudo resolver tu UID. Usa /start primero.");
                return;
            }

            // Diagnóstico previo: última actividad en Firestore
            let lastActDate = 'desconocida';
            try {
                const snap = await db.collection('users').doc(userId).collection('activities')
                    .orderBy('start_time', 'desc').limit(1).get();
                if (!snap.empty) {
                    const st = snap.docs[0].data()?.start_time;
                    lastActDate = st ? String(st).slice(0, 10) : 'sin start_time';
                }
            } catch (e: any) {
                lastActDate = `error: ${e.message}`;
            }

            const [garminResult, withingsResult] = await Promise.allSettled([
                syncGarmin(userId),
                syncWithings(userId)
            ]);
            const garmin = garminResult.status === 'fulfilled' ? garminResult.value : { error: (garminResult.reason as Error).message };
            const withings = withingsResult.status === 'fulfilled' ? withingsResult.value : { error: (withingsResult.reason as Error).message };
            const garminMsg = (garmin as any)?.error ? `❌ Garmin: ${(garmin as any).error}` : `✅ Garmin: ${(garmin as any)?.added ?? 0} nuevos registros`;
            const withingsMsg = (withings as any)?.error ? `❌ Withings: ${(withings as any).error}` : `✅ Withings: ${(withings as any)?.added ?? 0} registros`;
            await ctx.reply(`*Sync completado*\n\n${garminMsg}\n${withingsMsg}\n\n_Última actividad previa en DB: ${lastActDate}_`, { parse_mode: 'Markdown' });
        } catch (err: any) {
            await ctx.reply(`❌ Error durante la sincronización: ${err.message}`);
        }
    });

    /**
     * BLOQUE 3C: Manejo de Acuse de Recibo (Callback Queries)
     */
    b.on('callback_query:data', async (ctx) => {
        const data = ctx.callbackQuery.data;
        
        if (data.startsWith('read_')) {
            const alertId = data.replace('read_', '');
            const chatId = ctx.from.id.toString();
            const docId = `${chatId}_${alertId}`;
            
            if (db) {
                try {
                    await db.collection('sent_alerts').doc(docId).update({
                        readAt: new Date().toISOString()
                    });
                    await ctx.answerCallbackQuery("✅ Alerta marcada como leída.");
                    await ctx.editMessageText(`${ctx.callbackQuery.message?.text}\n\n✅ *Leída el ${new Date().toLocaleTimeString()}*`, { parse_mode: 'Markdown' });
                } catch (error: any) {
                    console.error("Error updating readAt:", error.message);
                    await ctx.answerCallbackQuery("⚠️ Error al actualizar estado.");
                }
            }
        }
    });

    b.command('logs', async (ctx) => {
        try {
            await ctx.replyWithChatAction('typing');
            const logs = await getRecentLogs();
            await sendSplitMessage(ctx, logs, { parse_mode: 'Markdown' });
        } catch (e: any) {
            await ctx.reply(`Error al cargar logs: ${e.message}`);
        }
    });

    b.on('message:text', async (ctx) => {
        try {
            const chatId = ctx.from?.id.toString();
            if (!chatId) return;

            // V4: Enviar mensaje de estado inmediato para mejorar UX y liberar el hilo de Telegram rápido
            const statusMsg = await ctx.reply("⏳ *Iniciando análisis...*", { parse_mode: 'Markdown' });

            // V4: Crear el Turno en la Máquina de Estados
            const turnId = await createTurn(chatId, ctx.message.text, false, statusMsg.message_id);
            const logger = getLogger(turnId, chatId);
            logger.info(`[V4 Ingest] New text message received`, {
                chatId,
                messageId: ctx.message.message_id,
                textPreview: ctx.message.text.substring(0, 50)
            });

            // V5: PROCESAMIENTO ASÍNCRONO VIA FIRESTORE TRIGGER
            // Ya no llamamos a processTurn aquí. El trigger 'processTurnEvent' en index.ts se encargará.
            log.info(`[V4 Ingest] Turn ${turnId} created. Handled by background Eventarc worker.`);

        } catch (error: any) {
            log.error('Error handling message:', error);
            await ctx.reply(`⚠️ Error del sistema de ingesta: ${error.message}`);
        }
    });

    b.on(['message:voice', 'message:audio'], async (ctx) => {
        try {
            const chatId = ctx.from?.id.toString();
            if (!chatId) return;

            const isVoice = !!ctx.message.voice;
            const statusMsg = await ctx.reply(isVoice ? "🎧 *Descargando y transcribiendo audio...*" : "📁 *Descargando archivo de audio...*", { parse_mode: 'Markdown' });

            // Download the file
            const file = await ctx.getFile();
            const downloadUrl = `https://api.telegram.org/file/bot${ENV.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error("Failed to download audio file from Telegram.");

            const buffer = Buffer.from(await response.arrayBuffer());

            // Transcribe using Groq
            const transcription = await transcribeAudio(buffer, isVoice ? 'voice.ogg' : 'audio.mp3');
            log.info(`[V4 Ingest] Transcripción recibida exitosamente.`, {
                length: transcription.length,
                type: isVoice ? 'voice' : 'audio'
            });

            await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, `⏳ *Procesando audio:* _"${transcription}"_`, { parse_mode: 'Markdown' });

            // V4: Crear el Turno
            const turnId = await createTurn(chatId, transcription, true, statusMsg.message_id);
            const logger = getLogger(turnId, chatId);
            logger.info(`[V4 Ingest] New audio message received/transcribed`, {
                chatId,
                type: isVoice ? 'voice' : 'audio'
            });

            // V5: PROCESAMIENTO ASÍNCRONO VIA FIRESTORE TRIGGER
            // Delegamos el resto del trabajo (IA + Respuesta) al worker de fondo.
            await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, `🎯 *Audio Transcrito:* _"${transcription}"_\n\n⏳ Analizando sesión...`, { parse_mode: 'Markdown' });
            log.info(`[V4 Ingest] Audio turn ${turnId} delegated to Eventarc for analysis.`);

        } catch (error: any) {
            log.error('Error handling audio:', error);
            await ctx.reply(`⚠️ Error de audio: ${error.message}`);
        }
    });
}
