import { chatCompletion } from './src/agent/llm.js';

async function test() {
    try {
        console.log("Testing Gemini 2.5 Flash...");
        const response = await chatCompletion([{ role: 'user', content: 'Say hello' }], undefined, "gemini-2.5-flash");
        console.log("Response:", response.content);
        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    }
}

test();
