import { db, initDB } from './src/memory/db.js';

async function check() {
    try {
        await initDB();
        const snap = await db.collection('messages').where('chatId', '==', '8067043732').orderBy('timestamp', 'desc').limit(20).get();
        if (snap.empty) {
            console.log("No messages found for this chatId.");
        }
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`[${data.timestamp?.toDate().toISOString()}] ${data.role}: ${data.content}`);
        });
        process.exit(0);
    } catch (err: any) {
        if (err.message.includes('requires an index')) {
           console.log("Index required. Trying without order...");
           const snap2 = await db.collection('messages').where('chatId', '==', '8067043732').limit(50).get();
           const msgs = snap2.docs.map(d => ({id: d.id, ...d.data()})).sort((a: any, b: any) => b.order - a.order);
           msgs.slice(0, 10).forEach((m: any) => {
               console.log(`[${new Date(m.order).toISOString()}] ${m.role}: ${m.content}`);
           });
           process.exit(0);
        }
        console.error(err);
        process.exit(1);
    }
}

check();
