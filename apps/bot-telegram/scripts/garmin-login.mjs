/**
 * garmin-login.mjs — Generador de token OAuth para Garmin Connect
 *
 * PROPOSITO:
 *   Cloudflare bloquea el login de Garmin desde IPs de datacenter (GCP).
 *   Este script se ejecuta DESDE TU PC (IP residencial), hace el login una sola vez,
 *   extrae el token OAuth y lo persiste en Firestore via la Cloud Function.
 *   El token dura aproximadamente 1 año — no es necesario repetir este proceso frecuentemente.
 *
 * USO:
 *   node apps/bot-telegram/scripts/garmin-login.mjs
 *
 * VARIABLES DE ENTORNO (opcionales — si no se pasan usa los valores default):
 *   GARMIN_EMAIL     — email de la cuenta Garmin Connect
 *   GARMIN_PASSWORD  — password de la cuenta Garmin Connect
 *   BIOENGINE_API    — URL base de la Cloud Function (default: produccion)
 *   ADMIN_TOKEN      — token de admin de BioEngine (default: bioengine-local)
 *
 * PREREQUISITO:
 *   npm install  (en apps/bot-telegram/) — la libreria garmin-connect ya esta en package.json
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const EMAIL = process.env.GARMIN_EMAIL || 'gonzaloobispo@hotmail.com';
const PASSWORD = process.env.GARMIN_PASSWORD || 'Gob29041976$';
const API_BASE = process.env.BIOENGINE_API || 'https://bioengine-v4.web.app/api-cloud';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'bioengine-local';

async function main() {
    console.log('=== BioEngine Garmin Token Generator ===');
    console.log(`Email: ${EMAIL}`);
    console.log(`API destino: ${API_BASE}/garmin/set-token`);
    console.log('');

    // La libreria garmin-connect es CJS — usar require
    let GarminConnect;
    try {
        const mod = require('garmin-connect');
        GarminConnect = mod.GarminConnect || mod.default?.GarminConnect || mod.default;
    } catch (err) {
        console.error('Error importando garmin-connect:', err.message);
        console.error('Ejecuta: cd apps/bot-telegram && npm install');
        process.exit(1);
    }

    console.log('Iniciando login en Garmin Connect...');
    const client = new GarminConnect({ username: EMAIL, password: PASSWORD });

    try {
        await client.login(EMAIL, PASSWORD);
        console.log('Login exitoso.');
    } catch (err) {
        console.error('Login fallido:', err.message);
        console.error('Verifica tus credenciales de Garmin Connect.');
        process.exit(1);
    }

    // La libreria garmin-connect expone exportToken() que devuelve { oauth1, oauth2 }
    // oauth2.access_token es el Bearer token usado en los requests HTTP
    let oauthToken;
    try {
        const exported = client.exportToken();
        oauthToken = JSON.stringify(exported);
        console.log('Token exportado correctamente.');
        console.log(`  oauth1 key: ${exported.oauth1?.oauth_token?.slice(0, 8)}...`);
        console.log(`  oauth2 access_token: ${exported.oauth2?.access_token?.slice(0, 16)}...`);
    } catch (err) {
        console.error('Error exportando token:', err.message);
        console.error('Intentando acceso directo al cliente HTTP...');

        // Fallback: intentar acceder directamente al HttpClient
        try {
            const oauth1 = client.client?.oauth1Token;
            const oauth2 = client.client?.oauth2Token;
            if (!oauth1 || !oauth2) throw new Error('oauth1Token o oauth2Token no disponible');
            oauthToken = JSON.stringify({ oauth1, oauth2 });
            console.log('Token obtenido via acceso directo al cliente.');
        } catch (innerErr) {
            console.error('Fallback fallido:', innerErr.message);
            process.exit(1);
        }
    }

    console.log('');
    console.log('Enviando token a Firestore via Cloud Function...');

    let response;
    try {
        response = await fetch(`${API_BASE}/garmin/set-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: ADMIN_TOKEN, oauthToken })
        });
    } catch (err) {
        console.error('Error de red al contactar la Cloud Function:', err.message);
        process.exit(1);
    }

    let data;
    try {
        data = await response.json();
    } catch {
        data = { raw: await response.text() };
    }

    if (!response.ok) {
        console.error(`HTTP ${response.status}:`, data);
        process.exit(1);
    }

    console.log('Respuesta:', data);
    console.log('');
    console.log('Token guardado exitosamente en Firestore.');
    console.log('La Cloud Function usara este token en las proximas sincronizaciones.');
    console.log('El token dura aproximadamente 1 anio.');
}

main().catch(err => {
    console.error('Error inesperado:', err);
    process.exit(1);
});
