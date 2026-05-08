import { db, initDB } from './memory/db.js';
import { FieldValue } from 'firebase-admin/firestore';

async function cleanup() {
    await initDB();
    await db.collection('messages').add({
        chatId: '8067043732',
        role: 'assistant',
        content: 'He delegado la tarea correctamente.',
        timestamp: FieldValue.serverTimestamp()
    });
    console.log('Appended assistant message to close the tool loop');
}
cleanup();
