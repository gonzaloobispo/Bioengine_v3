import { initDB } from './memory/db.js';
import { getPendingTurns } from './memory/state.js';

async function testIndex() {
    await initDB();
    try {
        const turns = await getPendingTurns("abcd");
        console.log(`Success! Found ${turns.length} pending turns.`);
    } catch (e: any) {
        console.error("Index Error:", e.message);
        console.error("Details:", e.details);
    }
}

testIndex();
