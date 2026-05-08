import { db, initDB } from './src/memory/db.js';

async function check() {
    try {
        await initDB();
        const userId = 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';
        
        // Peso
        const bioSnap = await db.collection('users').doc(userId).collection('biometrics').limit(500).get();
        const weights = bioSnap.docs
            .map((doc: any) => {
                const d = doc.data();
                const v = d.weightKg || d.weight_kg || d.value;
                const ts = d.timestamp?.toDate ? d.timestamp.toDate() : (d.date ? new Date(d.date) : null);
                return { value: v, timestamp: ts };
            })
            .filter((w: any) => w.value && w.timestamp)
            .sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
        
        const lastWeight = weights[0];
        console.log(`Last Weight: ${lastWeight?.value} kg on ${lastWeight?.timestamp?.toISOString()}`);

        // Última Actividad
        const activitySnap = await db.collection('users').doc(userId).collection('activities')
            .orderBy('timestamp', 'desc').limit(1).get();
        const lastActivity = activitySnap.docs[0]?.data();
        console.log(`Last Activity: ${lastActivity?.name || lastActivity?.type} on ${lastActivity?.timestamp?.toDate().toISOString()}`);

        process.exit(0);
    } catch (err: any) {
        console.error(err);
        process.exit(1);
    }
}

check();
