import { db, initDB } from './src/memory/db.js';

async function check() {
    try {
        await initDB();
        const mapping = await db.collection('telegram_mappings').doc('8067043732').get();
        if (mapping.exists) {
            console.log("Mapping found:", mapping.data());
        } else {
            console.log("No mapping found for 8067043732");
        }
        process.exit(0);
    } catch (err: any) {
        console.error(err);
        process.exit(1);
    }
}

check();
