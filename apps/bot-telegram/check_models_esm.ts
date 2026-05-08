import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY NOT FOUND");
    process.exit(1);
}

const genAI = new GoogleGenAI({ apiKey: apiKey });

async function run() {
    const models = ['gemini-2.0-flash-lite-preview-02-05', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
    for (const m of models) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const res = await model.generateContent("Hi");
            console.log(`✅ ${m}: ${res.response.text()}`);
        } catch (e: any) {
            console.log(`❌ ${m}: ${e.message}`);
        }
    }
}

run();
