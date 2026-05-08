import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });
import { chatCompletion } from './src/agent/llm.js';

async function run() {
    console.log("🚀 Evaluando Router de BioEngine V3 (Firebase Deployable)...");
    try {
        const response = await chatCompletion([
            { role: 'user', content: 'Di "Hola desde la nube" y nada mas.' }
        ]);
        console.log("✅ Respuesta Exitosa:", response.content);
    } catch (e: any) {
        console.error("❌ Router falló por completo:", e.message);
    }
}

run();
