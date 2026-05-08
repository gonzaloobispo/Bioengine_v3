import { GoogleGenAI } from '@google/genai';
require('dotenv').config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listModels() {
    try {
        const models = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Just to see what happens
        // Actually, the SDK has a listModels method (but maybe not in this version)
        // I'll try to find the current active one by testing
        console.log("Testing models...");
        const modelNames = ['gemini-2.0-flash-lite-preview-02-05', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
        for (const name of modelNames) {
            try {
                const model = genAI.getGenerativeModel({ model: name });
                const result = await model.generateContent("Hi");
                console.log(`✅ ${name}: OK`);
            } catch (e: any) {
                console.log(`❌ ${name}: ${e.message}`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

listModels();
