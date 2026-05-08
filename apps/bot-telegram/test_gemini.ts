import fetch from 'node-fetch';
import { ENV } from './src/config.js';

async function testGemini() {
    console.log("Testing Google Gemini Key...");
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ENV.GEMINI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gemini-1.5-flash',
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

testGemini();
