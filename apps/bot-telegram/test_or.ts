import fetch from 'node-fetch';
import { ENV } from './src/config.js';

async function testKey() {
    console.log("Testing OpenRouter Key...");
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.1-8b-instruct:free',
                messages: [{ role: 'user', content: 'Hi' }]
            })
        });
        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data));
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

testKey();
