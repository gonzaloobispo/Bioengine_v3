import fetch from 'node-fetch';
import { ENV } from './src/config.js';

async function testGeminiNative() {
    console.log("Testing Native Gemini API...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hola" }] }]
            })
        });
        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data).substring(0, 200));
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

testGeminiNative();
