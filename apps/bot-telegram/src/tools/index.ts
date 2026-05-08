import { getCurrentTimeTool } from './get_current_time.js';
import { generateVoiceTool } from './generate_voice.js';
import { googleWorkspace } from './google_workspace.js';
import { listNotebooks, queryNotebook } from './notebooklm.js';
import { saveMemory, getMemory, createDelegatedTask, linkTelegramId, getUserByTelegramId, saveBioMetric, getRecentBioMetrics, getRecentActivities, saveDailyHealth, getRecentDailyHealth, savePainRecord, getRecentPainLogs, getActivePlan, getEquipment } from '../memory/db.js';
import { spawn } from 'child_process';
import { Logger } from '../utils/logger.js';

const logger = new Logger('DelegationTool');

import * as fs from 'fs';

const adversarialReview = (args: { file_path: string; mode: string }) => {
    if (!fs.existsSync(args.file_path)) return `Error: File not found ${args.file_path}`;
    const content = fs.readFileSync(args.file_path, 'utf8');

    // Check size limit (~10k lines)
    if (content.split('\n').length > 10000) {
        return "Error: File is too massive for context (>10k lines). Test smaller targets.";
    }

    let focus = "General Quality";
    if (args.mode === "Security") focus = "1. Injection/Sanitization\n2. Auth Bypasses\n3. Data Leaks\n4. DOS Vectors";
    else if (args.mode === "Performance") focus = "1. O(n^2) loops\n2. Memory Leaks\n3. Blocking I/O\n4. Allocations";
    else if (args.mode === "Logic") focus = "1. Off-by-one\n2. Null Refs\n3. Race Conditions";

    return `# ⚔️ ADVERSARIAL REVIEW REQUEST
**TARGET:** ${args.file_path}
**MODE:** ${args.mode}

### 🎯 FOCUS AREAS:
${focus}

## 📄 CODE ARTIFACT
\`\`\`
${content}
\`\`\`

INSTRUCCIONES PARA EL LLM: Ahora debes adoptar la postura de un atacante (Red Team) y criticar sin piedad el código anterior basándote en las FOCUS AREAS. Detalla los vectores de ataque detectados y propone soluciones.`;
};

import { modifyPlan } from './plan_modification.js';
import { explainExercise, suggestRegression } from './exercise_tools.js';

export const availableTools = {
    get_current_time: getCurrentTimeTool,
    generate_voice: generateVoiceTool,
    google_workspace: (args: { command: string }) => googleWorkspace(args.command),
    notebook_list: (_args: Record<string, never>) => listNotebooks(),
    notebook_query: (args: { notebook_id: string; question: string }) => queryNotebook(args.notebook_id, args.question),
    save_memory: (args: { key: string; value: string }) => saveMemory(args.key, args.value),
    get_memory: (args: { key: string }) => getMemory(args.key),
    adversarial_review: adversarialReview,
    delegate_task: async (args: { task_name: string; objective: string; context: string }, extra: { chatId: string }) => {
        const taskId = await createDelegatedTask(args.task_name, args.objective, args.context, extra.chatId);

        // Spawn sub-agent process
        logger.info(`Spawning sub-agent for task ${taskId}...`);
        const proc = spawn('npx', ['tsx', 'src/subagent/runner.ts', taskId], {
            detached: true,
            stdio: 'ignore',
            shell: true // Windows needs shell for npx
        });
        proc.unref();

        return {
            status: "delegated",
            task_id: taskId,
            message: `Sub-agente '${args.task_name}' iniciado correctamente. Se está ejecutando en segundo plano.`
        };
    },
    bioengine_link: async (args: { web_uid: string }, extra: { chatId: string }) => {
        await linkTelegramId(extra.chatId, args.web_uid);
        return { success: true, message: `Cuenta de BioEngine vinculada correctamente (Telegram: ${extra.chatId}, WebUID: ${args.web_uid}).` };
    },
    bioengine_save_metric: async (args: { type: string; value: number; unit: string }, extra: { chatId: string }) => {
        try {
            await saveBioMetric(extra.chatId, args.type, args.value, args.unit);
            return { success: true, message: `Métrica '${args.type}' guardada: ${args.value}${args.unit}.` };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
    bioengine_get_profile: async (_args: any, extra: { chatId: string }) => {
        const user = await getUserByTelegramId(extra.chatId);
        if (!user) return { success: false, message: "Usuario no vinculado a BioEngine. Di 'Vincular mi cuenta XXXXX' para empezar." };
        return { success: true, profile: user };
    },
    bioengine_get_metrics: async (args: { type?: string; limit?: number }, extra: { chatId: string }) => {
        try {
            const metrics = await getRecentBioMetrics(extra.chatId, args.type, args.limit);
            return { success: true, metrics };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
    bioengine_get_metrics_v2: async (args: { type?: string; limit?: number }, extra: { chatId: string }) => {
        try {
            const metrics = await getRecentBioMetrics(extra.chatId, args.type, args.limit);
            return { success: true, metrics };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
    bioengine_get_activities: async (args: { type?: string; limit?: number }, extra: { chatId: string }) => {
        try {
            const activities = await getRecentActivities(extra.chatId, args.type, args.limit);
            return { success: true, activities };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
    bioengine_get_daily_health: async (args: { limit?: number }, extra: { chatId: string }) => {
        try {
            const daily = await getRecentDailyHealth(extra.chatId, args.limit);
            return { success: true, daily };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
    bioengine_save_pain: async (args: { level: number; location: string; side: string; notes?: string }, extra: { chatId: string }) => {
        try {
            await savePainRecord(extra.chatId, args.level, args.location, args.side, args.notes);
            return { success: true, message: `Dolor en ${args.location} (${args.side}) nivel ${args.level} registrado.` };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
    bioengine_get_pain: async (args: { limit?: number }, extra: { chatId: string }) => {
        try {
            const logs = await getRecentPainLogs(extra.chatId, args.limit);
            return { success: true, logs };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
    bioengine_v3_get_plan: async (_args: any, extra: { chatId: string }) => {
        try {
            // Firestore: User-Scoped Cloud Standard
            const plan = await getActivePlan(extra.chatId);
            if (plan) return { success: true, plan, source: 'Firestore (Cloud)' };

            throw new Error(`No se encontró ningún plan activo en la nube.`);
        } catch (e: any) {
            return { success: false, message: `Error recuperando plan: ${e.message}` };
        }
    },
    bioengine_modify_plan: async (args: any, extra: { chatId: string }) => {
        return await modifyPlan(args, extra);
    },
    bioengine_explain_exercise: async (args: { name: string }) => {
        return await explainExercise(args.name);
    },
    bioengine_trigger_sync: async (_args: any) => {
        // En GCP Cloud Functions no existe servidor local ni scripts .bat.
        // La sincronización ocurre automáticamente vía el cron scheduledHealthSync.
        return {
            success: true,
            message: 'La sincronización de datos de salud se realiza automáticamente cada 4 horas (cron cloud). No se requiere acción manual en la arquitectura cloud-native.'
        };
    },
    bioengine_suggest_regression: async (args: { name: string }) => {
        return await suggestRegression(args.name);
    },
    bioengine_get_equipment: async (_args: any, extra: { chatId: string }) => {
        try {
            const user = await getUserByTelegramId(extra.chatId);
            const userId = user?.id || extra.chatId;
            const equipment = await getEquipment(userId);
            return { success: true, equipment };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
    bioengine_v3_update_session: async (args: { plan_id: number; session_idx: number; date?: string; title?: string; description?: string; is_completed?: boolean }, extra: { chatId: string }) => {
        try {
            // Migrado a Firestore-native. Construimos la instrucción y llamamos al servicio de planes.
            const { modifyPlan: modifyPlanService } = await import('../services/plans.js');
            const { getUserByTelegramId } = await import('../memory/db.js');

            const user = await getUserByTelegramId(extra.chatId);
            const userId = user?.id || user?.userId || user?.uid;
            if (!userId) throw new Error('No se pudo resolver el userId para chatId: ' + extra.chatId);

            // Obtener el plan activo
            const { db } = await import('../memory/db.js');
            const plansSnap = await db.collection('users').doc(userId).collection('plans')
                .where('status', '==', 'active').orderBy('updatedAt', 'desc').limit(1).get();
            if (plansSnap.empty) throw new Error('No active plan found in Firestore for user ' + userId);
            const planId = plansSnap.docs[0].id;

            const parts: string[] = [`Update session ${args.session_idx}`];
            if (args.date) parts.push(`new date: ${args.date}`);
            if (args.title) parts.push(`new title: ${args.title}`);
            if (args.description) parts.push(`new description: ${args.description}`);
            if (args.is_completed !== undefined) parts.push(`completed: ${args.is_completed}`);
            const instruction = parts.join(' | ');

            const result = await modifyPlanService(userId, planId, instruction, args.session_idx);
            return { success: true, message: 'Sesión actualizada en Firestore.', result };
        } catch (e: any) {
            return { success: false, message: `Error actualizando sesión: ${e.message}` };
        }
    }
};

export const toolDefinitions = [
    // ... (previous tools)
    {
        type: "function",
        function: {
            name: "get_current_time",
            description: "Returns the current local time.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_voice",
            description: "Genera un audio a partir del texto. Úsalo SOLO cuando el usuario pida explícitamente audio. Tras llamarlo una vez, finaliza tu respuesta con texto confirmando el envío.",
            parameters: {
                type: "object",
                properties: {
                    text: { type: "string", description: "El texto exacto que quieres que se diga en voz alta." }
                },
                required: ["text"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "google_workspace",
            description: "HERRAMIENTA AUTORIZADA PARA GOOGLE. Puedes leer, enviar y gestionar correos y calendario. \n- GMAIL: 'gmail search label:inbox --max 10', 'gmail get ID', 'gmail batch modify ID --add TRASH' (borrar), 'gmail batch modify ID --remove INBOX' (archivar).\n- CALENDARIO: 'calendar events --today', 'calendar events --tomorrow', 'calendar events --week', 'calendar search \"reunion\" --days 7', 'calendar create primary --summary \"Taller\" --from 2024-05-10T10:00:00Z --to 2024-05-10T11:00:00Z'.\nIMPORTANTE: Usa siempre '--max' (Gmail) o '--today/--tomorrow/--week' (Calendar) para limitar resultados. No inventes comandos fuera de estos grupos.",
            parameters: {
                type: "object",
                properties: {
                    command: { type: "string", description: "Comando gog (sin 'gog'). Ej: 'gmail search label:inbox --max 5' o 'calendar events --today'." }
                },
                required: ["command"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "notebook_list",
            description: "Lista todos los cuadernos de NotebookLM disponibles con su título e ID.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "notebook_query",
            description: "Consulta un cuaderno de NotebookLM con una pregunta en lenguaje natural.",
            parameters: {
                type: "object",
                properties: {
                    notebook_id: { type: "string", description: "El ID del cuaderno de NotebookLM a consultar." },
                    question: { type: "string", description: "La pregunta a responder." }
                },
                required: ["notebook_id", "question"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "save_memory",
            description: "Guarda información importante sobre el usuario (preferencias, datos personales, notas) para recordarla en el futuro.",
            parameters: {
                type: "object",
                properties: {
                    key: { type: "string", description: "Clave única para identificar el dato (ej: 'user_preferences')." },
                    value: { type: "string", description: "El valor a guardar." }
                },
                required: ["key", "value"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_memory",
            description: "Recupera información guardada previamente sobre el usuario usando una clave.",
            parameters: {
                type: "object",
                properties: {
                    key: { type: "string", description: "La clave del dato a recuperar." }
                },
                required: ["key"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delegate_task",
            description: "Delega una tarea compleja a un sub-agente especializado que trabajará de forma autónoma. El usuario será notificado cuando termine.",
            parameters: {
                type: "object",
                properties: {
                    task_name: { type: "string", description: "Nombre corto de la tarea (ej: 'Market Research')." },
                    objective: { type: "string", description: "Propósito detallado y resultado esperado." },
                    context: { type: "string", description: "Cualquier información adicional, URLs o datos necesarios." }
                },
                required: ["task_name", "objective", "context"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "adversarial_review",
            description: "Genera una revisión de 'Red Team' para un archivo complejo. El sistema te devolverá un prompt de ataque para que tú mismo (como agente adversario) encuentres vulnerabilidades.",
            parameters: {
                type: "object",
                properties: {
                    file_path: { type: "string", description: "La ruta relativa o absoluta del archivo a revisar." },
                    mode: { type: "string", description: "El enfoque de la revisión. Opciones: 'Security', 'Performance', 'Logic'." }
                },
                required: ["file_path", "mode"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_link",
            description: "Vincula el ID de Telegram del usuario con su UID de la plataforma Web (BioEngine). Úsalo cuando el usuario te proporcione su código de vinculación o UID.",
            parameters: {
                type: "object",
                properties: {
                    web_uid: { type: "string", description: "El UID de Firebase que el usuario copió desde el dashboard de BioEngine." }
                },
                required: ["web_uid"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_save_metric",
            description: "Registra una métrica de salud o deporte (peso, pulsaciones, dolor, etc.) en el perfil de BioEngine del usuario.",
            parameters: {
                type: "object",
                properties: {
                    type: { type: "string", description: "Tipo de métrica (ej: 'weight', 'heart_rate', 'knee_pain')." },
                    value: { type: "number", description: "El valor numérico." },
                    unit: { type: "string", description: "La unidad (ej: 'kg', 'bpm', '0-10')." }
                },
                required: ["type", "value", "unit"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_get_profile",
            description: "Obtiene el perfil completo del usuario: altura, edad, deportes, lesiones activas, medicaciones, objetivos, análisis del coach (estado de forma, riesgo de lesión, recomendación hoy, ACWR, HRV, sueño). ÚSALO para preguntas sobre historial médico, lesiones, equipamiento o contexto general del atleta.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_get_metrics",
            description: "Obtiene los biométricos y métricas recientes del usuario desde Withings/Garmin: peso (weight_kg), IMC (bmi), % grasa (fat_percent), % músculo (muscle_percent). ÚSALO para cualquier pregunta sobre composición corporal, IMC, peso, grasa.",
            parameters: {
                type: "object",
                properties: {
                    type: { type: "string", description: "Opcional. Tipo de métrica (ej. 'weight', 'fatiga', 'pain'). Si se omite, trae de todos los tipos." }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_get_activities",
            description: "Obtiene los entrenamientos y actividades físicas recientes del usuario.",
            parameters: {
                type: "object",
                properties: {
                    type: { type: "string", description: "Opcional. Tipo de actividad (ej. 'Ciclismo', 'Running', 'Strength_Training')." }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_get_daily_health",
            description: "Obtiene los datos de salud diaria recientes (HRV, sueño, body battery, readiness).",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_save_pain",
            description: "Registra un log de dolor físico para rastrear recuperación o fatiga.",
            parameters: {
                type: "object",
                properties: {
                    level: { type: "number", description: "Nivel de dolor del 0 al 10." },
                    location: { type: "string", description: "Localización del dolor (ej: 'Rodilla', 'Tobillo', 'Lumbar')." },
                    side: { type: "string", description: "Lado afectado ('Derecha', 'Izquierda', 'Bilateral')." },
                    notes: { type: "string", description: "Opcional. Notas sobre el dolor." }
                },
                required: ["level", "location", "side"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_get_pain",
            description: "Obtiene los registros recientes de dolor físico.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number", description: "Opcional. Cantidad de logs a traer. Por defecto 5." }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_v3_get_plan",
            description: "Obtiene el plan de entrenamiento activo directamente desde el motor BioEngine V3. Úsalo para saber qué toca entrenar esta semana o hoy.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_v3_update_session",
            description: "Modifica una sesión de entrenamiento en BioEngine V3 (ej: mover de fecha, cambiar descripción).",
            parameters: {
                type: "object",
                properties: {
                    plan_id: { type: "number", description: "El ID numérico del plan." },
                    session_idx: { type: "number", description: "El índice de la sesión dentro del plan (0-8)." },
                    date: { type: "string", description: "Opcional. Nueva fecha en formato YYYY-MM-DD." },
                    title: { type: "string", description: "Opcional. Nuevo título de la sesión." },
                    description: { type: "string", description: "Opcional. Nueva descripción." },
                    is_completed: { type: "boolean", description: "Opcional. Marcar como completada o no." }
                },
                required: ["plan_id", "session_idx"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_modify_plan",
            description: "Modifica el plan de entrenamiento activo (omitir sesiones, mover fechas, reemplazar ejercicios).",
            parameters: {
                type: "object",
                properties: {
                    action: { type: "string", enum: ["SKIP", "MOVE", "REPLACE", "REDUCE", "ADD", "FREQUENCY"], description: "Tipo de modificación lógica." },
                    plan_id: { type: "number", description: "ID del plan de entrenamiento." },
                    session_idx: { type: "number", description: "Opcional. Índice de la sesión (0-8). Úsalo si sabes que la fecha original ha cambiado." },
                    date: { type: "string", description: "Fecha de la sesión a modificar (YYYY-MM-DD)." },
                    target_date: { type: "string", description: "Nueva fecha (solo para MOVE)." },
                    exercise_id: { type: "string", description: "Nombre del ejercicio original (solo para REPLACE simple)." },
                    replacement_id: { type: "string", description: "Nombre del ejercicio nuevo (solo para REPLACE simple)." },
                    replacements: { 
                        type: "array", 
                        items: {
                            type: "object",
                            properties: {
                                exercise_id: { type: "string" },
                                replacement_id: { type: "string" },
                                reason: { type: "string" }
                            },
                            required: ["exercise_id", "replacement_id"]
                        },
                        description: "Opcional. Lista de reemplazos para multi-replace en una misma sesión." 
                    },
                    reason: { type: "string", description: "Motivo del cambio (dolor, falta de tiempo, etc)." },
                    force: { type: "boolean", description: "Si es true, ignora las advertencias de carga doble (OVERLOAD_ADVISORY)." }
                },
                required: ["action", "plan_id"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_explain_exercise",
            description: "Obtén instrucciones detalladas, beneficios y contraindicaciones de un ejercicio.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Nombre del ejercicio a explicar." }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_trigger_sync",
            description: "Sincroniza los datos de salud reales (Garmin/Withings) con BioEngine mediante el proceso local de NotebookLM.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_suggest_regression",
            description: "Sugiere una variante más sencilla de un ejercicio si el usuario tiene dolor o dificultad.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Nombre del ejercicio original." }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "bioengine_get_equipment",
            description: "Consulta el equipamiento deportivo del usuario (zapatillas, bicicleta, raqueta) con km acumulados. Úsalo cuando el usuario pregunte por su gear, material deportivo o desgaste de equipamiento.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    }
];

export async function executeToolCall(toolCall: any, extra: { chatId: string }): Promise<string> {
    const toolName = toolCall.function.name;
    const toolFn = availableTools[toolName as keyof typeof availableTools] as (args: any, extra: any) => Promise<any>;

    if (!toolFn) {
        return `Error: Tool ${toolName} not found.`;
    }

    try {
        const parsedArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
        const result = await toolFn(parsedArgs, extra);
        return JSON.stringify(result);
    } catch (error: any) {
        return `Error executing tool ${toolName}: ${error.message}`;
    }
}
