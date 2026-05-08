import { db, initDB } from '../src/memory/db.js';
import fetch from 'node-fetch';

async function setupWebhook(userId: string, baseUrl: string) {
    try {
        await initDB();
        console.log(`Buscando tokens de Withings para el usuario: ${userId}`);
        const doc = await db.collection('users').doc(userId)
            .collection('secrets').doc('withings_tokens').get();
        
        if (!doc.exists) {
            console.error('Tokens no encontrados. El usuario debe autenticarse primero.');
            process.exit(1);
        }

        const tokens = doc.data();
        const accessToken = tokens?.access_token;

        if (!accessToken) {
            console.error('Access token no válido.');
            process.exit(1);
        }

        const callbackUrl = `${baseUrl}/api-cloud/webhook/withings`;
        console.log(`Registrando webhook apuntando a: ${callbackUrl}`);

        // appli 1 = Weight, 4 = Blood Pressure, 44 = Sleep, 16 = ECG, etc.
        // Registraremos para appli 1 (Básculas) que es lo principal.
        const params = new URLSearchParams({
            action: 'subscribe',
            callbackurl: callbackUrl,
            appli: '1'
        });

        const resp = await fetch('https://wbsapi.withings.net/notify', {
            method: 'POST',
            body: params,
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const json = await resp.json() as any;
        
        if (json.status === 0) {
            console.log('¡Éxito! Webhook registrado correctamente.');
        } else {
            console.error('Error al registrar webhook:', json);
            if (json.status === 247 || json.status === 401) {
                console.error('El token expiró. Ejecuta una sincronización manual primero para refrescar el token, y luego reintenta este script.');
            }
        }
    } catch (e) {
        console.error('Error de ejecución:', e);
    } finally {
        process.exit(0);
    }
}

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Uso: npx tsx scripts/setup_withings_webhook.ts <USER_ID> <BASE_URL>');
    console.log('Ejemplo: npx tsx scripts/setup_withings_webhook.ts gonzalo-v4 https://bioengine-v4.web.app');
    process.exit(1);
}

setupWebhook(args[0], args[1]);
