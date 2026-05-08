import { initDB, db } from './src/memory/db.js';

async function checkLastTurn() {
    await initDB();
    const chatId = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
    const snap = await db.collection('chats').doc(chatId).collection('turns')
        .orderBy('timestamp', 'desc').limit(1).get();
        
    if (snap.empty) {
        console.log('No turns found for chatId:', chatId);
        return;
    }
    
    const turn = snap.docs[0].data();
    console.log('--- ÚLTIMO TURNO DEL COACH ---');
    console.log('Status:', turn.status);
    console.log('Interación:', turn.iteration);
    
    // Leer los mensajes de este turno
    const messagesSnap = await db.collection('chats').doc(chatId).collection('messages')
        .where('turnId', '==', snap.docs[0].id).orderBy('timestamp', 'asc').get();
    
    messagesSnap.docs.forEach(doc => {
        const m = doc.data();
        console.log(`[${m.role}] ${m.content || '(Tool Call/Result)'}`);
        if (m.tool_calls) console.log('TOOL CALLS:', JSON.stringify(m.tool_calls, null, 2));
        if (m.role === 'tool') console.log('TOOL RESULT:', m.content);
    });
}

checkLastTurn().catch(console.error);
