
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });
const key = process.env.GEMINI_API_KEY || '';

async function list() {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    try {
        const result = await genAI.listModels();
        console.log("Available Gemini Models:");
        for (const m of result.models) {
            console.log(`- ${m.name} (${m.displayName})`);
        }
    } catch (e) {
        console.error("Failed to list models:", e);
    }
}
list();
