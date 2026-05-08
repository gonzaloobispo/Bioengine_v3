import fetch from 'node-fetch';

const TOKEN = "8283418538:AAF8zYh8wQj0gytzglOCj0PLAyUfEx3tMTg";
const WEBHOOK_URL = "https://us-central1-bioengine-v4.cloudfunctions.net/opengravity";

async function fixWebhook() {
    console.log("Checking current webhook...");
    const getRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
    const getInfo = await getRes.json();
    console.log("Current Info:", JSON.stringify(getInfo));

    console.log(`\nSetting webhook to: ${WEBHOOK_URL}...`);
    const setRes = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook?url=${WEBHOOK_URL}`);
    const setResult = await setRes.json();
    console.log("Result:", JSON.stringify(setResult));
}

fixWebhook();
