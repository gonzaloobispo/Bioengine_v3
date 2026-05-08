
import { ENV } from '../config.js';
import { log } from '../utils/logger.js';

export interface Message {
    role: 'user' | 'assistant' | 'system' | 'model' | 'tool';
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
}

export interface LLMUsage {
    provider: 'gemini' | 'groq' | 'openrouter';
    model: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    context?: string;
}

/**
 * Sanitiza el historial de mensajes para APIs estilo OpenAI (Groq, OpenRouter).
 * Elimina:
 * - Mensajes `assistant` con `tool_calls` que NO están seguidos por mensajes `tool` (causa 400 en Groq)
 * - Mensajes `tool` que NO están precedidos por un `assistant` con `tool_calls` (causa 400 en Groq)
 * Esto evita cascadas de fallo cuando una vuelta anterior terminó a mitad de un tool-call.
 */
function sanitizeMessagesForOpenAI(messages: Message[]): Message[] {
    const result: Message[] = [];
    for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if ((m.role === 'assistant' || m.role === 'model') && m.tool_calls?.length) {
            // Solo incluir si el siguiente mensaje es un tool result
            const next = messages[i + 1];
            if (!next || next.role !== 'tool') {
                log.warn(`[Sanitizer] Descartando assistant con tool_calls huérfano (sin tool result siguiente).`);
                continue;
            }
        }
        if (m.role === 'tool') {
            // Solo incluir si el mensaje previo en result fue assistant con tool_calls
            const prev = result[result.length - 1];
            if (!prev || !((prev.role === 'assistant' || prev.role === 'model') && prev.tool_calls?.length)) {
                log.warn(`[Sanitizer] Descartando tool result huérfano (sin assistant con tool_calls previo).`);
                continue;
            }
        }
        result.push(m);
    }
    return result;
}

export async function chatCompletion(messages: Message[], tools?: any[], modelOverride?: string, onUsage?: (usage: LLMUsage) => void): Promise<Message> {
    log.info(`--- COGNITION CALLING IA (Speed Priority 2026) ---`);

    // --- CAPA 0: GEMINI (Prioritario — modelo nativo del proyecto, soporta tools) ---
    if (ENV.GEMINI_API_KEY) {
        try {
            const geminiModel = modelOverride || 'gemini-2.5-flash';
            log.info(`[Router] Intentando Gemini (${geminiModel}) con ${tools?.length || 0} tools...`);
            const { GoogleGenerativeAI, FunctionCallingMode } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);

            // Convertir tool definitions OpenAI → Gemini FunctionDeclaration
            let geminiTools: any[] = [];
            if (tools?.length) {
                const functionDeclarations = tools
                    .filter((t: any) => t.type === 'function' && t.function)
                    .map((t: any) => ({
                        name: t.function.name,
                        description: t.function.description || '',
                        parameters: t.function.parameters || { type: 'object', properties: {} }
                    }));
                if (functionDeclarations.length > 0) {
                    geminiTools = [{ functionDeclarations }];
                }
            }

            const modelConfig: any = {
                model: geminiModel,
                generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
            };
            if (geminiTools.length > 0) {
                modelConfig.tools = geminiTools;
                modelConfig.toolConfig = { functionCallingConfig: { mode: FunctionCallingMode.AUTO } };
            }

            const systemMsgs = messages.filter(m => m.role === 'system');
            const systemText = systemMsgs.map(m => m.content).join('\n\n');
            if (systemText) {
                modelConfig.systemInstruction = { parts: [{ text: systemText }] };
            }

            const model = genAI.getGenerativeModel(modelConfig);

            const nonSystemMsgs = messages.filter(m => m.role !== 'system');
            const geminiHistory: any[] = [];

            // Convertir mensajes previos a formato Gemini
            for (let i = 0; i < nonSystemMsgs.length - 1; i++) {
                const m = nonSystemMsgs[i];
                const role = (m.role === 'model' || m.role === 'assistant') ? 'model' : 'user';

                if (role === 'model') {
                    if (m.tool_calls?.length) {
                        geminiHistory.push({
                            role: 'model',
                            parts: m.tool_calls.map((tc: any) => ({
                                functionCall: {
                                    name: tc.function.name,
                                    args: (() => { try { return JSON.parse(tc.function.arguments || '{}'); } catch { return {}; } })()
                                }
                            }))
                        });
                    } else {
                        geminiHistory.push({ role: 'model', parts: [{ text: m.content || '' }] });
                    }
                } else if (m.role === 'tool') {
                    let result: any;
                    try { result = JSON.parse(m.content || '{}'); } catch { result = { output: m.content }; }
                    geminiHistory.push({
                        role: 'user',
                        parts: [{ functionResponse: { name: m.name || 'tool', response: result } }]
                    });
                } else {
                    geminiHistory.push({ role: 'user', parts: [{ text: m.content || '' }] });
                }
            }

            // Sanitizar historial Gemini:
            // 1. Eliminar functionResponse huérfanos (sin model/functionCall previo)
            // 2. Eliminar functionCall huérfano al final (sin functionResponse siguiente)
            // 3. Colapsar roles repetidos consecutivos (Gemini requiere alternancia estricta)
            const sanitizedHistory: any[] = [];
            for (let i = 0; i < geminiHistory.length; i++) {
                const entry = geminiHistory[i];
                const hasFunctionResponse = entry.parts?.some((p: any) => p.functionResponse);
                const hasFunctionCall = entry.parts?.some((p: any) => p.functionCall);

                if (hasFunctionResponse) {
                    // Solo incluir si el anterior en sanitizedHistory es model con functionCall
                    const prev = sanitizedHistory[sanitizedHistory.length - 1];
                    const prevHasFnCall = prev?.parts?.some((p: any) => p.functionCall);
                    if (!prev || !prevHasFnCall) {
                        log.warn('[Gemini Sanitizer] Descartando functionResponse huérfano.');
                        continue;
                    }
                }
                if (hasFunctionCall) {
                    // Solo incluir si el siguiente es functionResponse
                    const next = geminiHistory[i + 1];
                    const nextHasFnResponse = next?.parts?.some((p: any) => p.functionResponse);
                    if (!next || !nextHasFnResponse) {
                        log.warn('[Gemini Sanitizer] Descartando functionCall huérfano (sin functionResponse siguiente).');
                        continue;
                    }
                }

                // Colapsar roles repetidos: fusionar partes en el último entry
                const last = sanitizedHistory[sanitizedHistory.length - 1];
                if (last && last.role === entry.role) {
                    last.parts = [...last.parts, ...entry.parts];
                } else {
                    sanitizedHistory.push({ ...entry, parts: [...entry.parts] });
                }
            }

            const lastMsg = nonSystemMsgs[nonSystemMsgs.length - 1];
            let lastPart: any;
            if (lastMsg?.role === 'tool') {
                let result: any;
                try { result = JSON.parse(lastMsg.content || '{}'); } catch { result = { output: lastMsg.content }; }
                lastPart = { functionResponse: { name: lastMsg.name || 'tool', response: result } };
            } else {
                lastPart = { text: lastMsg?.content || '' };
            }

            // Si el último del historial tiene el mismo rol que el mensaje actual → chat limpio
            const lastInHistory = sanitizedHistory[sanitizedHistory.length - 1];
            const currentRole = (lastMsg?.role === 'model' || lastMsg?.role === 'assistant') ? 'model' : 'user';

            let chatSession;
            if (lastInHistory && lastInHistory.role === currentRole) {
                log.warn(`[Router][Gemini] Desajuste de roles detectado (repetición de ${currentRole}). Iniciando chat limpio.`);
                // If lastPart is a functionResponse with no history context, convert to plain text
                if (lastMsg?.role === 'tool') {
                    let toolContent: string;
                    try { toolContent = JSON.stringify(JSON.parse(lastMsg.content || '{}')); }
                    catch { toolContent = lastMsg.content || ''; }
                    lastPart = { text: `[Resultado de herramienta ${lastMsg.name || 'tool'}]: ${toolContent}` };
                    log.warn(`[Router][Gemini] lastPart era functionResponse huérfano — convertido a texto.`);
                }
                chatSession = model.startChat({ history: [] });
            } else {
                chatSession = model.startChat({ history: sanitizedHistory });
            }
            const geminiTimeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Gemini timeout (30s)')), 30000)
            );
            const result = await Promise.race([chatSession.sendMessage([lastPart]), geminiTimeout]) as any;
            const response = result.response;

            const candidate = response.candidates?.[0];
            const functionCallParts = candidate?.content?.parts?.filter((p: any) => p.functionCall) || [];

            // Capturar uso de tokens Gemini
            if (onUsage && response.usageMetadata) {
                const um = response.usageMetadata;
                onUsage({
                    provider: 'gemini',
                    model: geminiModel,
                    input_tokens: um.promptTokenCount || 0,
                    output_tokens: um.candidatesTokenCount || 0,
                    total_tokens: um.totalTokenCount || ((um.promptTokenCount || 0) + (um.candidatesTokenCount || 0))
                });
            }

            if (functionCallParts.length > 0) {
                const tool_calls = functionCallParts.map((p: any, idx: number) => ({
                    id: `call_gemini_${idx}_${Date.now()}`,
                    type: 'function',
                    function: {
                        name: p.functionCall.name,
                        arguments: JSON.stringify(p.functionCall.args || {})
                    }
                }));
                log.info(`[Router] Gemini solicitó ${tool_calls.length} tool(s): ${tool_calls.map((tc: any) => tc.function.name).join(', ')}`);
                return { role: 'assistant', content: '', tool_calls };
            }

            const text = response.text();
            log.info(`[Router] Éxito con Gemini (texto).`);
            return { role: 'assistant', content: text };
        } catch (e: any) {
            console.error(`[Router] FATAL Gemini Error:`, e);
            log.error(`[Router] Error en Gemini: ${e.message}`, { 
                stack: e.stack,
                details: e.response?.promptFeedback || e.response?.candidates?.[0]?.finishReason 
            });
        }
    }

    // --- CAPA 1: GROQ (Ultra-Rápido, < 2s) ---
    if (ENV.GROQ_API_KEY) {
        try {
            log.info(`[Router] Intentando Groq (Llama-3.3-70b)...`);
            const groqMessages = sanitizeMessagesForOpenAI(messages);

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ENV.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: groqMessages.map(m => {
                        const msg: any = {
                            role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : m.role,
                            content: m.content || null
                        };
                        if (m.tool_calls) msg.tool_calls = m.tool_calls;
                        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
                        if (m.name) msg.name = m.name;
                        return msg;
                    }),
                    tools: tools,
                    temperature: 0.7
                })
            });

            if (response.ok) {
                const data: any = await response.json();
                const choice = data.choices[0].message;
                log.info(`[Router] Éxito con Groq.`);
                const rawContent: string = choice.content || '';
                if (!choice.tool_calls && rawContent.includes('<function=')) {
                    log.warn('[Router] Groq retornó markup <function=...> en content. Descartando respuesta contaminada. Continuando con OpenRouter.');
                } else {
                    if (onUsage && data.usage) {
                        onUsage({
                            provider: 'groq',
                            model: 'llama-3.3-70b-versatile',
                            input_tokens: data.usage.prompt_tokens || 0,
                            output_tokens: data.usage.completion_tokens || 0,
                            total_tokens: data.usage.total_tokens || ((data.usage.prompt_tokens || 0) + (data.usage.completion_tokens || 0))
                        });
                    }
                    return {
                        role: 'assistant',
                        content: choice.content,
                        tool_calls: choice.tool_calls
                    };
                }
            } else {
                const errorText = await response.text();
                log.warn(`[Router] Groq falló: ${response.status} - ${errorText}`);
            }
        } catch (err: any) {
            log.error(`[Router] Error en Groq: ${err.message}`, { stack: err.stack });
        }
    }

    // --- CAPA 2: OPENROUTER (Respaldo Inteligente) ---
    // NOTA: No usar modelos :free — tienen rate limits de ~10 req/día y no soportan tools bien.
    // Usar google/gemini-2.0-flash-001 como default que tiene mejor free tier en OpenRouter.
    if (ENV.OPENROUTER_API_KEY) {
        try {
            const orModel = modelOverride || (ENV.OPENROUTER_MODEL && !ENV.OPENROUTER_MODEL.includes(':free') ? ENV.OPENROUTER_MODEL : null) || "google/gemini-2.0-flash-001";
            log.info(`[Router] Intentando OpenRouter: ${orModel}...`);
            // Sanitizar historial para OpenRouter también
            const orMessages = sanitizeMessagesForOpenAI(messages);
            const controller = new AbortController();
            const orTimeout = setTimeout(() => controller.abort(), 45000);
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'X-Title': 'BioEngine V3'
                },
                body: JSON.stringify({
                    model: orModel,
                    messages: orMessages.map(m => {
                        const msg: any = {
                            role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : m.role,
                            content: m.content || null
                        };
                        if (m.tool_calls) msg.tool_calls = m.tool_calls;
                        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
                        if (m.name) msg.name = m.name;
                        return msg;
                    }),
                    tools,
                    temperature: 0.7,
                    max_tokens: 4096  // evitar 402 por solicitar max_tokens default (65535)
                })
            });

            clearTimeout(orTimeout);
            if (response.ok) {
                const data: any = await response.json();
                const orMessage = data.choices[0].message;
                // BUG FIX: sanitizar markup <function=...> que algunos modelos de OpenRouter generan
                const orContent: string = orMessage?.content || '';
                if (!orMessage?.tool_calls && orContent.includes('<function=')) {
                    log.warn('[Router] OpenRouter retornó markup <function=...> en content. Limpiando.');
                    orMessage.content = orContent.replace(/<function=[^>]*>.*?<\/function>/gs, '').trim()
                        || 'Procesando tu solicitud...';
                }
                log.info(`[Router] Éxito con OpenRouter.`);
                if (onUsage && data.usage) {
                    onUsage({
                        provider: 'openrouter',
                        model: orModel,
                        input_tokens: data.usage.prompt_tokens || 0,
                        output_tokens: data.usage.completion_tokens || 0,
                        total_tokens: data.usage.total_tokens || ((data.usage.prompt_tokens || 0) + (data.usage.completion_tokens || 0))
                    });
                }
                return orMessage;
            }
            const errorText = await response.text();
            log.warn(`[Router] OpenRouter falló: ${response.status} - ${errorText}`);
            if (response.status === 429) {
                console.error('[Router][OPENROUTER_RATELIMIT] OpenRouter 429 — modelo con rate limit excedido. Considera cambiar OPENROUTER_MODEL en .env');
            }
        } catch (err: any) {
            if ((err as any).name === 'AbortError') {
                log.error('[Router] OpenRouter timeout (45s)');
            } else {
                log.error(`[Router] Error en OpenRouter: ${err.message}`);
            }
        }
    }

    throw new Error("Todos los proveedores de IA fallaron.");
}

/**
 * Transcribe audio usando Groq (Whisper-large-v3) para máxima velocidad.
 */
export async function transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
    if (!ENV.GROQ_API_KEY) throw new Error("GROQ_API_KEY no configurada para transcripción.");

    log.info(`[Audio] Transcribiendo ${filename} (${buffer.length} bytes)...`);

    const formData = new FormData();
    // V4.5: Safe conversion from Node Buffer to Web Blob for fetch
    const blob = new Blob([new Uint8Array(buffer)]); 
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'text');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ENV.GROQ_API_KEY}`
        },
        body: formData
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Groq Whisper failed: ${err}`);
    }

    return await response.text();
}

