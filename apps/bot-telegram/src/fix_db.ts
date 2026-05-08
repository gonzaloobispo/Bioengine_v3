import { db, initDB } from './memory/db.js';

async function fix() {
    await initDB();
    const sfRef = db.collection('messages');
    const snapshot = await sfRef.where('role', '==', 'tool').get();
    let count = 0;
    for(const doc of snapshot.docs) {
        const data = doc.data();
        if(!data.tool_call_id) {
            console.log('Fixing doc', doc.id);
            await doc.ref.update({ tool_call_id: 'call_patched_id_' + count++ });
        }
    }
    console.log('Fixed', count, 'documents');
}
fix();
