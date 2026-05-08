import { initDB, db } from './src/memory/db.js';

async function main() {
    await initDB();
    const chatsSnap = await db.collection('chats').get();
    for (const chatDoc of chatsSnap.docs) {
        const turnsSnap = await db.collection('chats').doc(chatDoc.id).collection('turns')
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();

        console.log(`--- LATEST TURNS FOR CHAT ${chatDoc.id} ---`);
        turnsSnap.forEach((doc: any) => {
            const data = doc.data();
            console.log(`[${data.createdAt?.toDate().toISOString()}] ID: ${doc.id} Status: ${data.status} wasVoice: ${data.wasVoiceRequest}`);
        });
    }
    process.exit(0);
}

main();
