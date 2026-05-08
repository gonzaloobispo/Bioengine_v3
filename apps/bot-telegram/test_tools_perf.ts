import { initDB, db } from './src/memory/db.js';
import { getRecentBioMetrics, getRecentActivities, getUserByTelegramId } from './src/memory/db.js';

async function testTools() {
    try {
        await initDB();
        const chatId = '8067043732'; // User's Telegram ID
        console.log("Testing tools for chatId:", chatId);

        const start = Date.now();
        console.log("Calling getRecentBioMetrics(weight)...");
        const weights = await getRecentBioMetrics(chatId, 'weight', 5);
        console.log(`Weights (${Date.now() - start}ms):`, weights.length);

        const start2 = Date.now();
        console.log("Calling getRecentActivities()...");
        const activities = await getRecentActivities(chatId, undefined, 5);
        console.log(`Activities (${Date.now() - start2}ms):`, activities.length);

        process.exit(0);
    } catch (err: any) {
        console.error("Test failed:", err);
        process.exit(1);
    }
}

testTools();
