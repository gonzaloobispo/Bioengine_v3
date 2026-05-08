import { initDB, db } from './src/memory/db.js';

async function auditCycling() {
    await initDB();
    const uid = 'gonzalo-v4';
    const snap = await db.collection('users').doc(uid).collection('activities').get();
        
    console.log(`--- Audit Total (${snap.size}) ---`);
    const cyclingDocs = snap.docs.filter(d => ['ciclismo', 'cycling'].includes(String(d.data().type || '').toLowerCase()));
    cyclingDocs.sort((a,b) => {
        const at = a.data().timestamp || a.data().start_time || a.data().fecha || 0;
        const bt = b.data().timestamp || b.data().start_time || b.data().fecha || 0;
        return (bt.toMillis ? bt.toMillis() : new Date(bt).getTime()) - (at.toMillis ? at.toMillis() : new Date(at).getTime());
    });

    console.log(`--- Audit Ciclismo (${cyclingDocs.length}) ---`);
    cyclingDocs.slice(0, 30).forEach(doc => {
        const d = doc.data();
        let time;
        if (d.timestamp?.toDate) time = d.timestamp.toDate();
        else if (d.timestamp?._seconds) time = new Date(d.timestamp._seconds * 1000);
        else time = new Date(d.timestamp || d.start_time || d.fecha);
        
        console.log(` - ${doc.id}: ${time.toISOString()} | Dist: ${d.distance_km || d.distanceKm} | Dur: ${d.duration_minutes || d.durationMinutes} | Cal: ${d.calories} | Type: ${d.type}`);
    });
}

auditCycling().catch(console.error);
