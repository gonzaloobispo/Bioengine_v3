import { initDB, linkTelegramId } from './src/memory/db.js';

async function run() {
    await initDB();
    await linkTelegramId('8067043732', 'gonzalo-v4');
    console.log('LINK SUCCESSFUL: 8067043732 -> gonzalo-v4');
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
