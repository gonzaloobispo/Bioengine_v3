import { initDB, db } from './src/memory/db.js';
import * as dotenv from 'dotenv';
dotenv.config();

const USER_UID = process.env.BIOENGINE_OWNER_UID || 'o9Jhw8cQyANOrWrh0j1GdtCvSGT2';

async function investigate() {
    await initDB();
    console.log(`\n🔍 Investigating User: ${USER_UID}\n`);

    const snapActivities = await db.collection('users').doc(USER_UID).collection('biometrics').limit(10).get();
for (const doc of snapActivities.docs) {
    const data = doc.data();
    console.log(`[Bio] id=${doc.id}: date=${data.date || data.timestamp} weight=${data.peso || data.weight_kg || data.weightKg}`);
}
    process.exit(0);
}

investigate();
