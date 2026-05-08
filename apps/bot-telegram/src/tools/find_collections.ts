import { db, initDB } from '../memory/db.js';
import { validateConfig } from '../config.js';

async function listCollections() {
    validateConfig();
    await initDB();
    console.log('--- Scanning collections for users/gonzalo-v4 ---');
    
    // Check subcollections for the user
    const subCollections = await db.collection('users').doc('gonzalo-v4').listCollections();
    console.log('Sub-collections for gonzalo-v4:', subCollections.map((c: any) => c.id));
    
    // Check root collections
    const rootCollections = await db.listCollections();
    console.log('Root collections:', rootCollections.map((c: any) => c.id));
    
    // Specifically search for 'alerts' or 'notifications'
    const possibleAlerts = ['alerts', 'notifications', 'hitl', 'logs', 'audit'];
    for (const collName of possibleAlerts) {
        const snap = await db.collection('users').doc('gonzalo-v4').collection(collName).limit(1).get();
        if (!snap.empty) {
            console.log(`[FOUND] Subcollection '${collName}' has data.`);
        }
    }
}

listCollections().catch(console.error);
