import { initDB } from './src/memory/db.ts';
import { processTurn } from './src/agent/worker.ts';
import { getLogger } from './src/utils/logger.ts';

async function testBot() {
    await initDB();
    const chatId = "8067043732_test_clean";
    const turnId = 'test_' + Date.now();
    const userMessage = "¿Cuál es mi peso actual?";
    
    console.log(`🧪 SIMULATING MESSAGE: "${userMessage}" for user ${chatId}`);
    
    // Inject Turn into state if needed (But worker usually creates/gets it)
    // Actually, I need to make sure the state handles it or just mock it.
    // I'll call processTurn directly with a mock state if possible.
    
    try {
        // We need a turn in RECEIVED state in Firestore
        const { updateTurnStatus } = await import('./src/memory/state.js');
        // Creating a dummy turn for testing
        const turn = {
            id: turnId,
            chatId: chatId,
            userMessage: userMessage,
            status: 'RECEIVED',
            timestamp: new Date().toISOString(),
            wasVoiceRequest: false
        };
        
        // Manual insertion to Firestore 'chats/ID/turns' collection
        const { db } = await import('./src/memory/db.js');
        await db.collection('chats').doc(chatId).collection('turns').doc(turnId).set(turn);
        
        console.log("TSX > Turn created in Firestore. Processing...");
        
        const result = await processTurn(chatId, turnId);
        
        if (result) {
            console.log("\n✅ BOT RESPONSE:");
            console.log("TEXT:", result.text);
            if (result.voiceBuffer) console.log("VOICE: Generated (Buffer size: " + result.voiceBuffer.length + ")");
        } else {
            console.log("\n❌ BOT RETURNED UNDEFINED (Wait or Failure)");
        }
        
        process.exit(0);
    } catch (e: any) {
        console.error("\n💀 TEST FAILED:", e.message);
        process.exit(1);
    }
}

testBot();
