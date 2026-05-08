import { initDB, getMemory } from './src/memory/db.js';

async function check() {
    await initDB();
    const framework = await getMemory('AI_projects_framework');
    console.log("Memory AI_projects_framework:", framework);
    const fav = await getMemory('fav_framework');
    console.log("Memory fav_framework:", fav);
}

check();
