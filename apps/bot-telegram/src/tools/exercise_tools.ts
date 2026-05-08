/**
 * Exercise Tools — LLM-native (Cloud-only)
 * Generates exercise explanations and regressions via the LLM.
 * No Python backend dependency.
 */

export async function explainExercise(name: string) {
    try {
        const { chatCompletion } = await import('../agent/llm.js');
        const result = await chatCompletion([{
            role: 'user',
            content: `Explica el ejercicio "${name}" en detalle: técnica correcta, músculos trabajados, beneficios y contraindicaciones. Responde en español, de forma clara y concisa.`
        }]);
        return { success: true, exercise: name, explanation: result.content || '' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function suggestRegression(name: string) {
    try {
        const { chatCompletion } = await import('../agent/llm.js');
        const result = await chatCompletion([{
            role: 'user',
            content: `Sugiere 2-3 variantes más sencillas (regresiones) del ejercicio "${name}" para alguien con dolor o limitación física. Incluye cómo realizar cada variante. Responde en español.`
        }]);
        return { success: true, exercise: name, regressions: result.content || '' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
