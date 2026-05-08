import { chatCompletion } from './llm.js';
import { toolDefinitions, executeToolCall } from '../tools/index.js';
import { getMessages, saveMessage } from '../memory/db.js';
import { generateSpeech } from './tts.js';

const MAX_ITERATIONS = 10;

const SYSTEM_PROMPT = `You are OpenGravity, a State-of-the-Art Digital Workforce Orchestrator. 
The user is Gonzalo Obispo (gonzalo.obispo@gmail.com).

FILOSOFÍA AGÉNTICA V3.0:
1. HI-AUTOMATIZACIÓN: Si una tarea requiere más de 3 pasos, desglósala y ejecútala de forma autónoma.
2. PROACTIVIDAD EXTREMA: Sugiere mejoras, detecta duplicados y mantén la base de conocimientos limpia.
3. LOKI MODE (Orquestación): Divide solicitudes complejas en subtareas atómicas y ejecútalas sistemáticamente.

CAPACIDADES AVANZADAS:
- GOOGLE WORKSPACE: Tienes acceso total. GMAIL (búsqueda, basura, archivo). CALENDAR (eventos hoy/mañana/semana).
- NOTEBOOKLM (Sidecar Bridge): Eres el cliente de un Sidecar local estable. Si fallan las sesiones en la nube, indica que se debe activar el Sidecar en 'c:\\APP\\Notebook'.
- DATA MATCHER: Antes de guardar en memoria, verifica similitudes para evitar duplicados.
- RESEARCHER: Investiga el SOTA antes de recomendar tecnologías o soluciones.
- DELEGACIÓN: Usa 'delegate_task' para offloadear investigaciones largas o tareas complejas que no requieren respuesta inmediata. El usuario recibirá un reporte cuando el sub-agente termine.

REGLAS DE OPERACIÓN:
- GMAIL: 'gmail search label:inbox --max 10'.
- CALENDAR: 'calendar events --today'. Formato ISO 8601 para creación.
- MEMORIA: Usa 'save_memory' y 'get_memory' para persistencia.
- VOZ: Si el usuario envía audio, responde con audio automáticamente llamando a 'generate_voice' al final.

Be concise. Execute tools first, update user after with summary and next steps.`;

export interface AgentResponse {
    text: string;
    voiceBuffer?: Buffer;
}

export async function runAgentLoop(userMessage: string, chatId: string = 'default', wasVoiceRequest: boolean = false): Promise<AgentResponse> {
    // Save user message to memory
    await saveMessage('user', userMessage, chatId);

    const prevMessages = await getMessages(30, chatId); // Increased to 30
    let currentMessages: any[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...prevMessages
    ];

    let iterations = 0;
    let voiceRequestedText: string | null = null;

    while (iterations < MAX_ITERATIONS) {
        iterations++;
        console.log(`Agent Loop Iteration ${iterations} for chatId ${chatId}...`);

        try {
            const responseMessage = await chatCompletion(currentMessages, toolDefinitions);
            currentMessages.push(responseMessage);

            // Check if the LLM wanted to call a tool
            if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                // IMPORTANT: Save the message with tool_calls property
                await saveMessage(
                    responseMessage.role,
                    responseMessage.content || null,
                    chatId,
                    { tool_calls: responseMessage.tool_calls }
                );

                for (const toolCall of responseMessage.tool_calls) {
                    const toolName = toolCall.function.name;
                    // Log to console/internal log, NOT to assistant history
                    console.log(`[Calling tool: ${toolName}] for ${chatId}`);

                    const toolResultRaw = await executeToolCall(toolCall, { chatId });

                    // Capture voice request text if the tool was generate_voice
                    if (toolName === 'generate_voice') {
                        try {
                            const parsed = JSON.parse(toolResultRaw);
                            voiceRequestedText = parsed.text;
                        } catch (e) { }
                    }

                    // Save the tool result to memory
                    await saveMessage('tool', toolResultRaw, chatId, {
                        tool_call_id: toolCall.id,
                        name: toolName
                    });

                    currentMessages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        name: toolName,
                        content: toolResultRaw
                    });
                }
                // Continue the loop so the LLM can generate a response based on the tool output
                continue;
            }

            // If no tool was called, this is the final final answer
            const finalContent = responseMessage.content || "Done.";
            await saveMessage('assistant', finalContent, chatId);

            let voiceBuffer: Buffer | undefined;
            if (voiceRequestedText || wasVoiceRequest) {
                const textToSpeak = voiceRequestedText || finalContent;
                console.log(`Generating speech for: ${textToSpeak.substring(0, 30)}...`);
                voiceBuffer = await generateSpeech(textToSpeak);
            }

            return {
                text: finalContent,
                voiceBuffer
            };

        } catch (error: any) {
            console.error('Agent loop encountered an error:', error);
            const errorMessage = `An error occurred: ${error.message}`;
            // If it's a 400 error from OpenRouter/StepFun, we might want to clear memory or warn.
            return { text: errorMessage };
        }
    }

    const iterationWarning = "I reached the maximum number of thinking steps and had to stop to avoid looping.";
    await saveMessage('assistant', iterationWarning, chatId);
    return { text: iterationWarning };
}
