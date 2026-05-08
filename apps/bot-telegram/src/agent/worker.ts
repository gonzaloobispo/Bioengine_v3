import * as fs from 'fs';
import * as path from 'path';
import { getTurn, updateTurnStatus, saveToolCallsToTurn, saveToolResultsToTurn, finishTurn } from '../memory/state.js';
import { getMessages, saveMessage, getPendingDelegatedTasks, trackLLMUsage } from '../memory/db.js';
import { toolDefinitions } from '../tools/index.js';
import { generateSpeech } from './tts.js';
import { getLogger } from '../utils/logger.js';
import { CognitionHandler } from './cognition-handler.js';
import { ActionHandler } from './action-handler.js';
import { MemoryHandler } from './memory-handler.js';
import { db } from '../memory/db.js';
import * as admin from 'firebase-admin';

const BASE_SYSTEM_PROMPT = `Eres OpenGravity, coach IA personal de Gonzalo Obispo. Tienes acceso completo a todos sus datos en BioEngine.

PERFIL DEL ATLETA (datos de referencia siempre disponibles):
- Nombre: Gonzalo Obispo | 49 años | Sexo: Masculino
- Altura: 176 cm | Peso aproximado: ver bioengine_get_metrics para valor actual
- Deportes: ciclismo, running, tenis, natación, fuerza
- Objetivo: rendimiento sostenible sin lesiones
- Medicación: Atenolol 50mg (betabloqueante)
- Lesiones activas: dolor patelofemoral rodilla derecha, pronación severa pie izquierdo, pie plano bilateral
- Condiciones médicas: hipertensión controlada, tendinitis rotuliana

PROTOCOLO ATENOLOL:
NUNCA uses "220-edad" para FCmáx. Fórmula correcta: FCmáx = 164 - (0.7×49) = 130 bpm [Brawner].
El Atenolol suprime FC máxima ~32% y FC reposo -15 a -30 lpm. Si FC Garmin parece baja, es NORMAL.
Zonas: Z2 = 65-75% = 85-98 bpm. Prioriza RPE (Borg 12-14) y Test del Habla.

HERRAMIENTAS DISPONIBLES:
- bioengine_get_profile → perfil completo + análisis del coach (coachAnalysis con IMC, ACWR, HRV, etc.)
- bioengine_get_metrics → métricas recientes (peso, fatiga, dolor, etc.)
- bioengine_get_activities → actividades/entrenos recientes (Garmin)
- bioengine_get_daily_health → salud diaria (HRV, sueño, body battery, stress)
- bioengine_get_pain → registros de dolor
- bioengine_v3_get_plan → plan de entrenamiento activo
- bioengine_save_metric / bioengine_save_pain → registrar datos nuevos
- google_workspace → Gmail + Google Calendar
- generate_voice → respuesta en audio

CONTEXTO MASTER49 (atleta veterano +40):
- Recuperación más lenta: mínimo 48-72h entre sesiones intensas.
- Prioridad absoluta: prevención de lesiones > rendimiento.
- Periodización polarizada: 80% baja intensidad (Z2), 20% alta.
- Carga semanal máxima recomendada: aumentar ≤10% por semana.
- Sueño y HRV son KPIs principales de recuperación.
- Fuerza funcional: 2 sesiones/semana mínimo para mantener masa muscular.
- Running: máx 3 sesiones/semana por dolor patelofemoral. Priorizar superficie blanda.
- Composición corporal: objetivo IMC <25, grasa <22%, músculo >57%.
- Monitorear ACWR: óptimo 0.8-1.3. >1.5 = riesgo lesión alto.

REGLAS OPERATIVAS:
- Actúa (llama tools) ANTES de responder si necesitas datos.
- Para IMC/composición corporal: usar bioengine_get_metrics (tiene bmi, fat_percent, muscle_percent).
- Para análisis global, lesiones, estado de forma: usar bioengine_get_profile.
- Para actividades/entrenos recientes: usar bioengine_get_activities.
- Para sueño/HRV/body battery: usar bioengine_get_daily_health.
- Para plan activo: usar bioengine_v3_get_plan.
- Sé conciso. No menciones IDs técnicos. Responde siempre en español.`;

/**
 * Carga el perfil del usuario desde Firestore para enriquecer el system prompt con datos actualizados.
 */
async function loadUserProfileContext(chatId: string): Promise<string> {
    try {
        const { getUserByTelegramId } = await import('../memory/db.js');
        const user = await getUserByTelegramId(chatId);
        if (!user) return '';

        const parts: string[] = [];
        const peso = user.peso || user.weight;
        const altura = user.altura || user.height || user.estatura || 176;
        if (peso) {
            const imc = (peso / ((altura / 100) ** 2)).toFixed(1);
            parts.push(`Peso en perfil: ${peso} kg | Altura: ${altura} cm | IMC estimado: ${imc}`);
        }
        if (user.coachAnalysis?.metricas_clave) {
            const m = user.coachAnalysis.metricas_clave;
            const bits = [];
            if (m.peso_kg) bits.push(`peso reciente: ${m.peso_kg} kg`);
            if (m.bmi) bits.push(`IMC: ${m.bmi}`);
            if (m.hrv_ms) bits.push(`HRV: ${m.hrv_ms} ms (${m.hrv_tendencia || ''})`);
            if (m.fc_reposo) bits.push(`FC reposo: ${m.fc_reposo} bpm`);
            if (m.acwr) bits.push(`ACWR: ${m.acwr}`);
            if (bits.length) parts.push(`Análisis coach (${user.coachAnalysis.generated_at?.split('T')[0] || 'reciente'}): ${bits.join(' | ')}`);
            if (user.coachAnalysis.estado_forma) parts.push(`Estado de forma: ${user.coachAnalysis.estado_forma}`);
        }
        return parts.length ? `\nDATOS ACTUALIZADOS DEL PERFIL:\n${parts.join('\n')}` : '';
    } catch {
        return '';
    }
}

export interface WorkerResult {
    text: string;
    voiceBuffer?: Buffer;
    media?: {
        type: 'image' | 'video';
        url: string;
        caption?: string;
    };
}

/**
 * Motor Central Asíncrono (Refactorizado V4.2)
 */
export async function processTurn(chatId: string, turnId: string, iteration: number = 0): Promise<WorkerResult | undefined> {
    const MAX_RECURSION = 10;
    if (iteration > MAX_RECURSION) {
        throw new Error(`[Worker] Max recursion reached for turn ${turnId}`);
    }
    const logger = getLogger(turnId, chatId);

    const cognition = new CognitionHandler(logger);
    const action = new ActionHandler(logger);
    const memory = new MemoryHandler(logger);
    
    const turn = await getTurn(chatId, turnId);
    if (!turn) {
        logger.error(`Turn ${turnId} not found in database.`);
        throw new Error(`[Worker] Turn ${turnId} not found.`);
    }

    logger.info(`Turno ${turnId} - Estado: ${turn.status}`, {
        status: turn.status,
        userMessageLength: turn.userMessage.length
    });

    // V4.11: Debug Trace for Session ID
    try {
        await db.collection('debug_sessions').doc('last').set({
            chatId,
            turnId,
            status: turn.status,
            timestamp: admin.firestore.Timestamp.now()
        }, { merge: true });
    } catch(e) {}

    try {
        switch (turn.status) {
            case 'RECEIVED':
                await saveMessage('user', turn.userMessage, chatId);
                logger.info(`[Intent] ${turn.userMessage}`);

                const resolved = await resolveRelativeDates(chatId, turn.userMessage, logger);
                if (resolved && resolved.status === 'none') {
                    const msg = `Para ${resolved.label} (${resolved.date}) no tienes ninguna sesión programada en tu plan de BioEngine.`;
                    await saveMessage('assistant', msg, chatId);
                    await finishTurn(chatId, turnId, msg);
                    logger.info(`[DateResolver] Short-circuit: NO sessions found for ${resolved.label}`);
                    
                    let voiceBuffer;
                    if (turn.wasVoiceRequest) {
                        try {
                            const cleanMsg = msg.replace(/session_idx_\d+/g, '').replace(/ID: \d+/g, '').trim();
                            voiceBuffer = await generateSpeech(cleanMsg);
                        } catch (e) {
                            logger.error("Error generating voice for short-circuit", e);
                        }
                    }
                    return { text: msg, voiceBuffer };
                }
                
                await updateTurnStatus(chatId, turnId, 'PENDING_LLM');
                return processTurn(chatId, turnId, iteration + 1);

            case 'PENDING_LLM':
                const relDateInfo = await resolveRelativeDates(chatId, turn.userMessage, logger);
                const messagesHistory = await prepareContext(chatId, turn, logger, relDateInfo);
                const currentDateTime = new Date().toLocaleString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const profileContext = await loadUserProfileContext(chatId);
                const dynamicSystemPrompt = `${BASE_SYSTEM_PROMPT}${profileContext}\n\nFECHA/HORA ACTUAL: ${currentDateTime}`;
                
                try {
                    // Obtener userId para tracking (fire-and-forget)
                    let trackingUserId = chatId;
                    try {
                        const { getUserByTelegramId } = await import('../memory/db.js');
                        const userInfo = await getUserByTelegramId(chatId);
                        if (userInfo?.id) trackingUserId = userInfo.id;
                    } catch {}

                    const response = await cognition.process({
                        systemPrompt: dynamicSystemPrompt,
                        messages: messagesHistory,
                        tools: toolDefinitions,
                        onUsage: (usage) => {
                            trackLLMUsage(trackingUserId, { ...usage, context: 'chat' })
                                .catch(err => logger.warn('trackLLMUsage failed (fire-and-forget)', err));
                        }
                    });

                    if (response.tool_calls?.length > 0) {
                        await saveMessage('assistant', null, chatId, { tool_calls: response.tool_calls });
                        await saveToolCallsToTurn(chatId, turnId, response.tool_calls);
                        return processTurn(chatId, turnId, iteration + 1);
                    } else {
                        const active = await getPendingDelegatedTasks(chatId);
                        if (active.length > 0) {
                            await updateTurnStatus(chatId, turnId, 'AGENT_MONITOR');
                        }

                        // V4.5: Memory extraction moved to background
                        memory.processLearnings(messagesHistory).catch(e => {
                            logger.error("Memory processing error (background)", e);
                        });

                        return await handleFinalResponse(chatId, turnId, turn, response.content || "Hecho.", logger);
                    }
                } catch (err: any) {
                    if (err.message.startsWith('IMP_STOP:')) {
                        return await handleFailure(chatId, turnId, err.message);
                    }
                    throw err;
                }

            case 'PENDING_TOOLS':
                const results = await action.handleToolCalls(turn.toolCalls, chatId);
                for (const res of results) {
                    await saveMessage('tool', res.content, chatId, {
                        tool_call_id: res.tool_call_id,
                        name: res.name
                    });
                }
                await saveToolResultsToTurn(chatId, turnId, results);
                return processTurn(chatId, turnId, iteration + 1);

            case 'AGENT_MONITOR':
                const pendingTasks = await getPendingDelegatedTasks(chatId);
                const finished = pendingTasks.filter(t => t.status === 'done' || t.status === 'failed');
                if (finished.length > 0) {
                    await updateTurnStatus(chatId, turnId, 'PENDING_LLM');
                    return processTurn(chatId, turnId, iteration + 1);
                }
                return undefined;

            case 'COMPLETED':
            case 'FAILED':
                return undefined;

            default:
                logger.warn(`Unknown status: ${turn.status}`);
                return undefined;
        }
    } catch (error: any) {
        return await handleFailure(chatId, turnId, error.message);
    }
}

async function prepareContext(chatId: string, turn: any, logger: any, resolvedDateInfo?: any) {
    const prevMessages = await getMessages(30, chatId);
    const messagesHistory: any[] = [...prevMessages];

    if (resolvedDateInfo) {
        if (resolvedDateInfo.status === 'single') {
            const s = resolvedDateInfo.sessions[0];
            const cleanTitle = s.title.replace(/session_idx[_-]?\d*/gi, '').trim();
            messagesHistory.push({
                role: 'system',
                content: `[CÓDIGO RESOLVER]: El usuario mencionó "${resolvedDateInfo.label}". 
Para el día ${resolvedDateInfo.date} hay exactamente UNA sesión: "${cleanTitle}".
ASUME esta sesión para cualquier modificación o consulta solicitado por el usuario. NO preguntes cuál sesión.
(ID interno de referencia para tus tools: ${s.session_idx || s.id}). NO lo menciones al usuario.`
            });
            logger.info(`[DateResolver] Auto-selected session: ${s.title} (Idx: ${s.session_idx}, Date: ${s.date})`);
        } else if (resolvedDateInfo.status === 'multiple') {
            const list = resolvedDateInfo.sessions.map((s: any, i: number) => `${i+1}. ${s.title.replace(/session_idx[_-]?\d*/gi, '')} (${s.date})`).join('\n');
            messagesHistory.push({
                role: 'system',
                content: `[CÓDIGO RESOLVER]: El usuario mencionó "${resolvedDateInfo.label}". 
Para el día ${resolvedDateInfo.date} hay VARIAS opciones:\n${list}\nPregunta al usuario a cuál se refiere evitando IDs técnicos.`
            });
            logger.info(`[DateResolver] Multiple sessions found for ${resolvedDateInfo.label}`);
        }
    }

    const activeTasks = await getPendingDelegatedTasks(chatId);
    if (activeTasks.length > 0) {
        const taskInfo = activeTasks.map(t => `- Task ${t.id} (${t.taskName}): Status ${t.status}${t.result ? ` | Result: ${JSON.stringify(t.result).substring(0, 300)}...` : ''}`).join('\n');
        messagesHistory.unshift({
            role: 'system',
            content: `CURRENT DELEGATED TASKS STATUS:\n${taskInfo}\nIf a task is 'done', notify the user and summarize the result. If 'failed', explain why.`
        });
    }

    return messagesHistory;
}

async function handleFinalResponse(chatId: string, turnId: string, turn: any, content: string, logger: any) {
    let media = undefined;
    let autoSummary = "";
    let voiceBuffer: Buffer | undefined = undefined;
    
    if (turn.toolResults && Array.isArray(turn.toolResults)) {
        for (const res of turn.toolResults) {
            try {
                const parsed = JSON.parse(res.content);
                if (parsed && parsed.media) {
                    media = parsed.media;
                }
                if (res.name === 'bioengine_explain_exercise' && parsed.nombre) {
                    const cleanExplicacion = parsed.explicacion.replace(/[_*`]/g, '\\$&').substring(0, 500);
                    const cleanInstrucciones = (parsed.instrucciones || []).map((i: string) => i.replace(/[_*`]/g, '\\$&')).join('\n');
                    const cleanContra = (parsed.contraindicaciones || []).map((i: string) => i.replace(/[_*`]/g, '\\$&')).join('\n');
                    autoSummary = `\n\n📖 **${parsed.nombre}**\n${cleanExplicacion}\n\n✅ *Instrucciones:* \n${cleanInstrucciones || 'Pendiente'}\n\n⚠️ *Cuidado:* ${cleanContra || 'Ninguna'}`;
                }
            } catch (e) {}
        }
    }

    if (content === "Hecho." && autoSummary) {
        content = "Hecho. Aquí tienes la explicación:" + autoSummary;
    }

    let voiceContent = content;
    const technicalIdRegex = /session_idx[_-]?\d*|plan_id[_-]?\d*|ID: \d*/gi;
    const voiceMatch = content.match(/\[VOICE:\s*(.*?)\]/s);
    if (voiceMatch) {
        voiceContent = voiceMatch[1];
        content = content.replace(/\[VOICE:.*?\]/s, '').trim();
    }

    if (!content || content.trim().length < 2) {
        content = autoSummary ? "Aquí tienes la información solicitada:" : "He procesado tu solicitud correctamente.";
    }

    const isExplanation = turn.toolResults?.some((r: any) => r.name === 'bioengine_explain_exercise' || r.name === 'bioengine_suggest_regression');
    const hasExerciseWords = /sentadilla|goblet|ejercicio|técnica|instrucciones|explicación|variante|apoyo/gi.test(content);
    const looksLikeExplanation = content.includes('📖') || content.includes('✅') || content.includes('**Explicación:**') || hasExerciseWords;
    const shouldVoice = turn.wasVoiceRequest || isExplanation || looksLikeExplanation || (content.length > 5 && content.length < 150);

    if (shouldVoice) {
        try {
            let finalVoiceString = voiceContent;
            if (isExplanation || looksLikeExplanation || content.length > 400) {
                const sentences = content.replace(/✅|📖|⚠️/g, '').split(/[.\n]/).filter(s => s.trim().length > 15).map(s => s.trim());
                // Aumentamos a 15 oraciones para explicaciones complejas (Fase 6B.2C)
                finalVoiceString = sentences.slice(0, 15).join('. ') + ".";
                if (isExplanation) {
                    finalVoiceString = `Te explico cómo hacerlo: ${finalVoiceString} He dejado el vídeo y todos los detalles técnicos en el chat.`;
                }
            }
            // Sanitización profunda del audio
            finalVoiceString = finalVoiceString.replace(technicalIdRegex, '').replace(/[*_`]/g, '').trim();
            
            logger.info(`[Voice] Generating audio (${finalVoiceString.length} chars). Timeout: 90s.`);
            voiceBuffer = await generateSpeech(finalVoiceString);
            logger.info("[Voice] Audio generated successfully.", { hasBuffer: !!voiceBuffer });
        } catch (e) {
            logger.warn("Falló la generación de voz TTS", e);
        }
    }
    
    // BUG FIX: detectar y eliminar markup <function=...> de LLMs que no ejecutan tool_calls
    // Esto ocurre cuando el modelo genera formato de función propio en lugar de JSON estándar
    const functionMarkupRegex = /<function=[^>]*>.*?<\/function>/gs;
    if (functionMarkupRegex.test(content)) {
        logger.warn('[Worker] Detectado markup <function=...> sin ejecutar. Sanitizando respuesta.');
        content = content.replace(functionMarkupRegex, '').trim();
        if (!content || content.length < 5) {
            content = 'Estoy analizando tus datos de recuperación. Un momento...';
        }
    }

    const superCleanContent = content.replace(technicalIdRegex, '').replace(/\(Referencia interna: \d+\)/gi, '').replace(/\s\s+/g, ' ').trim();
    await saveMessage('assistant', superCleanContent, chatId);
    await finishTurn(chatId, turnId, superCleanContent);

    return { text: superCleanContent, voiceBuffer, media };
}

async function handleFailure(chatId: string, turnId: string, message: string) {
    const logsDir = path.join(process.cwd(), '.gemini', 'antigravity', '.forensics');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const filepath = path.join(logsDir, `POSTMORTEM_${turnId}.md`);
    fs.writeFileSync(filepath, `# 💀 FAILURE POSTMORTEM\n\nTurn: ${turnId}\nError: ${message}`, 'utf8');
    await updateTurnStatus(chatId, turnId, 'FAILED', message);
    return { text: `⚠️ **Error Crítico**: ${message}` };
}

async function resolveRelativeDates(chatId: string, message: string, logger: any) {
    const lower = message.toLowerCase();
    let targetDate: string | null = null;
    let label = "";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // ORDEN CRÍTICO: Buscar primero los términos más específicos
    if (lower.includes("pasado mañana")) {
        const d = new Date(now); d.setDate(now.getDate() + 2);
        targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        label = "pasado mañana";
    } else if (lower.includes("mañana")) {
        const d = new Date(now); d.setDate(now.getDate() + 1);
        targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        label = "mañana";
    } else if (lower.includes("hoy")) {
        targetDate = todayStr;
        label = "hoy";
    }

    if (!targetDate) return null;
    logger.info(`[DateResolver] Calculando: "${label}" -> ${targetDate} (Hoy es ${todayStr})`);

    const { availableTools } = await import('../tools/index.js');
    try {
        const result = await (availableTools as any).bioengine_v3_get_plan({}, { chatId });
        if (!result.success || !result.plan) return null;
        const planObj = result.plan;
        // Formato normalizado: sessions siempre en la raíz del documento
        const sessions = Array.isArray(planObj.sessions) ? planObj.sessions : [];
        // Match flexible (maneja ceros a la izquierda opcionales o formatos inconsistentes)
        const normalize = (d: string) => d.split('-').map(p => parseInt(p)).join('-');
        const targetNorm = normalize(targetDate);
        const found = sessions.filter((s: any) => s.date && normalize(s.date) === targetNorm);
        
        logger.info(`[DateResolver] Búsqueda final: ${targetDate} (${targetNorm}) | Sesiones encontradas: ${found.length}`);
        return { status: found.length === 1 ? 'single' : (found.length === 0 ? 'none' : 'multiple'), label, date: targetDate, sessions: found };
    } catch (e) {
        return null;
    }
}
