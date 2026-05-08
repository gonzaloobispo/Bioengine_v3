import { initDB, db } from './src/memory/db.js';

async function findActiveChat() {
    await initDB();
    const chatsSnap = await db.collection('chats').get();
    
    console.log(`--- Buscando chats activos en ${chatsSnap.size} colecciones ---`);
    for (const chatDoc of chatsSnap.docs) {
        const turnsSnap = await db.collection('chats').doc(chatDoc.id).collection('turns')
            .orderBy('createdAt', 'desc').limit(5).get();
            
        if (!turnsSnap.empty) {
            console.log(`\n--- Chat ${chatDoc.id} ---`);
            turnsSnap.docs.forEach(tDoc => {
                const turn = tDoc.data();
                console.log(`  [${turn.status}] User: ${turn.userMessage?.substring(0, 50)}... TargetID: ${turn.chatId}`);
            });
        } else {
            console.log(`Chat ${chatDoc.id}: (Vacío)`);
        }
    }
}

findActiveChat().catch(console.error);
