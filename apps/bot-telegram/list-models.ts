import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from './src/config.js';

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
        // The SDK doesn't have a direct listModels yet in all versions, 
        // but we can try to fetch it manually.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${ENV.GEMINI_API_KEY}`);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
}

listModels();
