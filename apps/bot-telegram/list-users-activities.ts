import { initDB, db } from './src/memory/db.js';

async function listUsersWithActivities() {
    await initDB();
    const usersSnap = await db.collection('users').get();
    
    console.log(`--- Buscando actividades en ${usersSnap.size} usuarios ---`);
    for (const userDoc of usersSnap.docs) {
        const activitiesSnap = await db.collection('users').doc(userDoc.id).collection('activities').limit(1).get();
        if (!activitiesSnap.empty) {
            const count = (await db.collection('users').doc(userDoc.id).collection('activities').get()).size;
            console.log(` - User ${userDoc.id}: ${count} actividades`);
        }
    }
}

listUsersWithActivities().catch(console.error);
