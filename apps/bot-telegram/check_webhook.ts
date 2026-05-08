import { Bot } from 'grammy';
import { ENV } from './src/config.js';

async function check() {
    try {
        const token = process.env.TELEGRAM_BOT_TOKEN || ENV.TELEGRAM_BOT_TOKEN;
        if (!token) {
            console.log("No token found.");
            process.exit(1);
        }
        const bot = new Bot(token);
        const info = await bot.api.getWebhookInfo();
        console.log("Webhook Info:", JSON.stringify(info, null, 2));
        process.exit(0);
    } catch (err: any) {
        console.error(err);
        process.exit(1);
    }
}

check();
