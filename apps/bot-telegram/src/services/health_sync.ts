/**
 * BioEngine Health Sync Service
 * Sincroniza datos de Garmin Connect y Withings con Firestore.
 * Las credenciales se leen de Firestore — nunca hardcodeadas en código.
 * Corre exclusivamente en GCP (Cloud Function / Cloud Run).
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db, upsertGarminGear } from '../memory/db.js';

// ─────────────────────────────────────────
// TIPOS INTERNOS
// ─────────────────────────────────────────

export interface SyncResult {
    added: number;
    activitiesAdded?: number;
    healthAdded?: number;
    error?: string;
}

interface WithingsTokens {
    userid: string;
    access_token: string;
    refresh_token: string;
    scope: string;
    expires_in?: number;
    token_type?: string;
}

interface WithingsApp {
    client_id: string;
    client_secret: string;
}

interface GarminCreds {
    email: string;
    password: string;
}

// ─────────────────────────────────────────
// HELPERS FIRESTORE
// ─────────────────────────────────────────

async function getSecret<T>(userId: string, secretId: string): Promise<T> {
    const doc = await db.collection('users').doc(userId)
        .collection('secrets').doc(secretId).get();
    if (!doc.exists) {
        throw new Error(`Secret '${secretId}' no encontrado en Firestore para user ${userId}`);
    }
    return doc.data() as T;
}

async function saveTokens(userId: string, tokens: WithingsTokens): Promise<void> {
    await db.collection('users').doc(userId)
        .collection('secrets').doc('withings_tokens')
        .set({ ...tokens, updated_at: FieldValue.serverTimestamp() }, { merge: true });
}

async function getLastBiometricDate(userId: string): Promise<number> {
    try {
        const snap = await db.collection('users').doc(userId)
            .collection('biometrics')
            .limit(500)
            .get();
        if (snap.empty) {
            return Math.floor(Date.now() / 1000) - 30 * 86400;
        }

        let maxTs = 0;
        for (const doc of snap.docs) {
            const data = doc.data() as any;
            const ts = data.timestamp?.toDate?.()
                ? Math.floor(data.timestamp.toDate().getTime() / 1000)
                : (data.date ? Math.floor(new Date(`${data.date}T23:59:59Z`).getTime() / 1000) : 0);
            if (ts > maxTs) maxTs = ts;
        }

        return maxTs > 0 ? maxTs + 1 : Math.floor(Date.now() / 1000) - 30 * 86400;
    } catch {
        return Math.floor(Date.now() / 1000) - 30 * 86400;
    }
}

async function getLastActivityDate(userId: string): Promise<Date> {
    try {
        const snap = await db.collection('users').doc(userId)
            .collection('activities')
            .orderBy('start_time', 'desc')
            .limit(1)
            .get();
        if (snap.empty) {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return d;
        }
        const startTime = snap.docs[0].data()?.start_time;
        const parsed = startTime?.toDate ? startTime.toDate() : new Date(startTime);
        // Guard rail: si quedó una fecha futura por datos corruptos, no bloquear sync.
        if (isNaN(parsed.getTime()) || parsed.getTime() > Date.now() + 24 * 3600 * 1000) {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return d;
        }
        return parsed;
    } catch {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d;
    }
}

// ─────────────────────────────────────────
// WITHINGS SYNC
// ─────────────────────────────────────────

async function withingsRefreshToken(app: WithingsApp, tokens: WithingsTokens): Promise<WithingsTokens> {
    const params = new URLSearchParams({
        action: 'requesttoken',
        grant_type: 'refresh_token',
        client_id: app.client_id,
        client_secret: app.client_secret,
        refresh_token: tokens.refresh_token
    });

    const resp = await fetch('https://wbsapi.withings.net/v2/oauth2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });

    const json = await resp.json() as any;
    if (json.status !== 0) {
        if (json.error === 'invalid_grant' || String(json.error).includes('invalid refresh_token')) {
            throw new Error(`WITHINGS_AUTH_EXPIRED: El token de renovación ya no es válido. Reautorizar desde la web.`);
        }
        throw new Error(`Withings token refresh falló: status=${json.status} error=${json.error}`);
    }

    if (!json.body?.access_token || !json.body?.refresh_token) {
        throw new Error(`Withings refresh no devolvió tokens válidos en el body.`);
    }

    return {
        userid: String(json.body.userid || tokens.userid),
        access_token: json.body.access_token,
        refresh_token: json.body.refresh_token,
        scope: json.body.scope || tokens.scope,
        expires_in: json.body.expires_in,
        token_type: json.body.token_type || 'Bearer'
    };
}

export async function withingsExchangeCode(userId: string, code: string, redirectUri: string): Promise<WithingsTokens> {
    const app = await db.collection('users').doc(userId)
        .collection('secrets').doc('withings_app').get();
    if (!app.exists) {
        throw new Error('withings_app secrets not configured in Firestore');
    }
    const { client_id, client_secret } = app.data() as any;

    const params = new URLSearchParams({
        action: 'requesttoken',
        grant_type: 'authorization_code',
        client_id,
        client_secret,
        code,
        redirect_uri: redirectUri
    });

    const resp = await fetch('https://wbsapi.withings.net/v2/oauth2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });

    const json = await resp.json() as any;
    if (json.status !== 0) {
        throw new Error(`Withings code exchange falló: status=${json.status} error=${json.error || 'unknown'}`);
    }

    const tokens: WithingsTokens = {
        userid: String(json.body.userid),
        access_token: json.body.access_token,
        refresh_token: json.body.refresh_token,
        scope: json.body.scope,
        expires_in: json.body.expires_in,
        token_type: json.body.token_type || 'Bearer'
    };

    await saveTokens(userId, tokens);
    return tokens;
}

/**
 * Envoltorio genérico para llamadas a la API de Withings.
 * Intercepta automáticamente el estado 247 (Token Expirado) y realiza el ciclo de refresco
 * de forma transparente antes de reintentar la petición.
 */
async function withingsFetch(
    urlParams: URLSearchParams, 
    userId: string, 
    app: WithingsApp, 
    tokens: WithingsTokens
): Promise<{ json: any; updatedTokens: WithingsTokens }> {
    let currentTokens = tokens;
    
    const makeRequest = async (token: string) => {
        const resp = await fetch(`https://wbsapi.withings.net/measure?${urlParams.toString()}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        });
        return await resp.json() as any;
    };

    let json = await makeRequest(currentTokens.access_token);

    // Si el token expiró (Withings devuelve status 401 o 247 de forma específica)
    if (json.status === 401 || json.status === 247) {
        console.log(`[Withings] Estado ${json.status} detectado. Token expirado, iniciando recuperación automática...`);
        try {
            currentTokens = await withingsRefreshToken(app, currentTokens);
            await saveTokens(userId, currentTokens);
            console.log('[Withings] Token refrescado exitosamente. Reintentando petición...');
            // Reintentar la petición con el nuevo token
            json = await makeRequest(currentTokens.access_token);
        } catch (err: any) {
            if (err.message.includes('WITHINGS_AUTH_EXPIRED')) {
                throw new Error('WITHINGS_EXPIRED');
            }
            throw err;
        }
    }

    return { json, updatedTokens: currentTokens };
}

export async function syncWithings(userId: string, overrideLastUpdate?: number): Promise<SyncResult> {
    try {
        let tokens = await getSecret<WithingsTokens>(userId, 'withings_tokens');
        const app = await getSecret<WithingsApp>(userId, 'withings_app');
        const lastupdate = overrideLastUpdate || await getLastBiometricDate(userId);

        const params = new URLSearchParams({
            action: 'getmeas',
            // 1:peso, 5:masa_libre_grasa, 6:grasa%, 9:diastólica, 10:sistólica, 54:SpO2, 73:temp_piel, 76:músculo%, 91:PWV, 155:edad_vascular
            meastype: '1,5,6,9,10,54,73,76,91,155',
            lastupdate: lastupdate.toString()
        });

        const { json, updatedTokens } = await withingsFetch(params, userId, app, tokens);
        tokens = updatedTokens; // Por si hubo refresco

        if (json.status !== 0) {
            const msg = `Withings API error: status=${json.status} error=${json.error || 'unknown'}`;
            console.error(`[Withings] ${msg}`);
            return { added: 0, error: msg };
        }

        const measuregroups: any[] = json.body?.measuregrps || [];
        if (measuregroups.length === 0) {
            console.log('[Withings] Sin nuevas mediciones.');
            return { added: 0 };
        }

        // Procesar cada grupo de medición
        const batch = db.batch();
        let count = 0;

        // Obtener altura del usuario para cálculo de IMC (Body Mass Index)
        const userSnap = await db.collection('users').doc(userId).get();
        const heightM = (userSnap.data()?.profile?.height_cm || userSnap.data()?.altura_cm || 176) / 100;

        for (const grp of measuregroups) {
            const date = new Date(grp.date * 1000).toISOString().split('T')[0];
            const docRef = db.collection('users').doc(userId)
                .collection('biometrics').doc(`withings_${grp.grpid}`);
            const existingSnap = await docRef.get();

            const record: any = {
                date,
                timestamp: Timestamp.fromMillis(grp.date * 1000),
                source: 'withings',
                grpid: grp.grpid,
                updated_at: FieldValue.serverTimestamp()
            };

            // Mapeo exhaustivo de métricas
            for (const m of grp.measures || []) {
                const value = m.value * Math.pow(10, m.unit);
                if (m.type === 1) record.weight_kg = +value.toFixed(2);
                if (m.type === 5) record.fat_free_mass_kg = +value.toFixed(2);
                if (m.type === 6) record.fat_percent = +value.toFixed(2);
                if (m.type === 9) record.diastolic_bp = +value.toFixed(0);
                if (m.type === 10) record.systolic_bp = +value.toFixed(0);
                if (m.type === 54) record.spo2 = +value.toFixed(1);
                if (m.type === 73) record.skin_temperature = +value.toFixed(1);
                if (m.type === 76) record.muscle_percent = +value.toFixed(2);
                if (m.type === 91) record.pulse_wave_velocity = +value.toFixed(2);
                if (m.type === 155) record.vascular_age = +value.toFixed(0);
            }

            // Calcular IMC si tenemos el peso
            if (record.weight_kg && heightM > 0) {
                record.bmi = +(record.weight_kg / (heightM * heightM)).toFixed(1);
            }

            batch.set(docRef, record, { merge: true });
            if (!existingSnap.exists) count++;
        }

        await batch.commit();

        // Actualizar lastUpdated en el doc principal del usuario
        await db.collection('users').doc(userId).set(
            { lastUpdated: FieldValue.serverTimestamp() },
            { merge: true }
        );

        console.log(`[Withings] ${count} grupos de medición guardados.`);
        return { added: count };

    } catch (err: any) {
        if (err.message === 'WITHINGS_EXPIRED') {
            return { added: 0, error: 'WITHINGS_EXPIRED' };
        }
        const msg = err?.message || String(err);
        console.error(`[Withings] Error en sync: ${msg}`);
        return { added: 0, error: msg };
    }
}

// ─────────────────────────────────────────
// GARMIN SYNC — fetch directo con token OAuth
// Cloudflare bloquea logins desde GCP (datacenter). Solución:
//   1. Usuario hace login desde IP local → genera token → POST /garmin/set-token
//   2. Cloud Function carga el token OAuth desde Firestore → fetch directo
//   3. Si no hay token OAuth guardado → fallback a login con email/password
// ─────────────────────────────────────────

const GARMIN_BASE = 'https://connect.garmin.com';

function garminHeaders(accessToken: string): Record<string, string> {
    return {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://connect.garmin.com/modern/gear',
        'Origin': 'https://connect.garmin.com',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    };
}

async function garminFetch(url: string, accessToken: string): Promise<any> {
    const resp = await fetch(url, { headers: garminHeaders(accessToken) });
    if (resp.status === 401 || resp.status === 403) {
        throw new Error(`TOKEN_INVALID:${resp.status}`);
    }
    if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} en ${url}`);
    }
    return resp.json();
}

/**
 * Intenta renovar el access_token de Garmin usando el refresh_token OAuth2.
 * El endpoint de Garmin SSO acepta refresh desde cualquier IP (no está bloqueado por Cloudflare).
 * Guarda el token renovado en Firestore si tiene éxito.
 */
async function garminRefreshToken(userId: string, parsed: any): Promise<string | null> {
    const refreshToken = parsed?.oauth2?.refresh_token;
    if (!refreshToken) {
        console.warn('[Garmin] No hay refresh_token disponible en el token guardado.');
        return null;
    }

    // Credenciales públicas del cliente OAuth2 de Garmin Connect (usadas por garmin-connect library)
    // Son las mismas que usa la app móvil oficial de Garmin
    const GARMIN_CONSUMER_KEY    = 'FC3E99D2-118D-4D81-8FF6-3B4986B5798A';
    const GARMIN_CONSUMER_SECRET = 'E08WAR897WEy2knn7aFBrvegVAf0AFdWAFmHNEQNZA4';
    const credentials = Buffer.from(`${GARMIN_CONSUMER_KEY}:${GARMIN_CONSUMER_SECRET}`).toString('base64');

    try {
        console.log('[Garmin] Intentando renovar token automáticamente con refresh_token...');
        const resp = await fetch('https://sso.garmin.com/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }).toString(),
        });

        if (!resp.ok) {
            const body = await resp.text();
            console.error(`[Garmin] Refresh falló HTTP ${resp.status}: ${body}`);
            return null;
        }

        const json = await resp.json() as any;
        if (!json.access_token) {
            console.error('[Garmin] Refresh no retornó access_token:', json);
            return null;
        }

        // Construir token renovado manteniendo oauth1 y actualizando oauth2
        const renewedToken = {
            oauth1: parsed.oauth1,
            oauth2: {
                ...parsed.oauth2,
                access_token: json.access_token,
                refresh_token: json.refresh_token || refreshToken,
                expires_in: json.expires_in || 3600,
                token_type: json.token_type || 'Bearer',
            }
        };

        // Guardar token renovado en Firestore
        await db.collection('users').doc(userId)
            .collection('secrets').doc('garmin_oauth')
            .set({ token: JSON.stringify(renewedToken), updated_at: FieldValue.serverTimestamp() });

        console.log('[Garmin] ✅ Token renovado automáticamente y guardado en Firestore.');
        return json.access_token;

    } catch (err: any) {
        console.error(`[Garmin] Error en refresh automático: ${err.message}`);
        return null;
    }
}

/**
 * Sincroniza el gear (equipamiento) de Garmin Connect para un usuario.
 * Llama al endpoint de gear de Garmin con el access_token OAuth2
 * y hace upsert en users/{userId}/equipment via upsertGarminGear.
 */
export async function syncActivityGear(userId: string, activityId: string, client: any): Promise<any[]> {
    try {
        const url = `https://connectapi.garmin.com/gear-service/gear/filterGear?activityId=${activityId}`;
        const data = await client.get(url);
        const gearList: any[] = Array.isArray(data) ? data : [];
        
        if (gearList.length > 0) {
            const gearNames = gearList.map(g => g.displayName || g.customMakeModel || `${g.gearMakeName} ${g.gearModelName}`).join(', ');
            const docId = `garmin_${activityId}`;
            await db.collection('users').doc(userId).collection('activities').doc(docId).update({
                gear: gearNames,
                gear_ids: gearList.map(g => String(g.gearPk || g.uuid || ''))
            }).catch((e: any) => {
                // Si el documento no existe (raro), lo ignoramos o creamos
                console.warn(`[Garmin] Documento de actividad no encontrado para update gear: ${docId}`);
            });
            
            // NEW: Upsert each gear item into the user's equipment collection
            for (const item of gearList) {
                await upsertGarminGear(userId, {
                    gearId: String(item.gearPk || item.gearId || item.uuid || ''),
                    displayName: item.displayName || item.customMakeModel || `${item.gearMakeName} ${item.gearModelName}` || 'Gear Garmin',
                    gearTypeName: item.gearTypeName || item.gearType?.typeKey || '',
                    createDate: item.createDate ? String(item.createDate).split('T')[0] : undefined
                });
            }
            
            console.log(`[Garmin] Gear sincronizado para actividad ${activityId}: ${gearNames}`);
        }
        return gearList;
    } catch (err: any) {
        console.warn(`[Garmin Activity Gear] Error para actividad ${activityId}: ${err.message}`);
        return [];
    }
}

export async function syncGarminGear(userId: string, accessToken: string, profileId?: string, client?: any, userProfileNumber?: string, guid?: string): Promise<any[]> {
    const idsToTry = [userProfileNumber, profileId, guid].filter(id => id && id !== 'unknown');
    
    const endpoints: any[] = [];
    for (const id of idsToTry) {
        // NEW 2026 working endpoint
        endpoints.push({ url: `https://connectapi.garmin.com/gear-service/gear/filterGear?userProfilePk=${id}`, method: 'GET' });
        
        // filterGear variations
        endpoints.push({ url: `https://connect.garmin.com/gear-service/gear/filterGear`, method: 'POST', body: { userProfileNumber: id, start: 0, limit: 100 } });
        endpoints.push({ url: `https://connect.garmin.com/gear-service/gear/filterGear`, method: 'POST', body: { userProfileNumber: id, start: 0, limit: 100 }, headers: { 'Content-Type': 'application/vnd.garmin.connect.gear.filter+json' } });
        
        // userGear variations
        endpoints.push({ url: `https://connect.garmin.com/gear-service/gear/userGear/${id}`, method: 'GET' });
        endpoints.push({ url: `https://connectapi.garmin.com/gear-service/gear/userGear/${id}`, method: 'GET' });
        endpoints.push({ url: `https://connect.garmin.com/modern/proxy/gear-service/gear/userGear/${id}`, method: 'GET' });
        endpoints.push({ url: `https://connect.garmin.com/gear-service/gear/userGear/${id}?start=0&limit=100`, method: 'GET' });
        
        // activity gear
        endpoints.push({ url: `https://connect.garmin.com/gear-service/gear/user/${id}`, method: 'GET' });
    }
    endpoints.push({ url: `https://connect.garmin.com/gear-service/gear/filterGear`, method: 'POST', body: {} });
    endpoints.push({ url: `https://connectapi.garmin.com/gear-service/gear/user/gear`, method: 'GET' });
    endpoints.push({ url: `https://connectapi.garmin.com/gear-service/gear/filterGear?userProfilePk=${idsToTry[0]}`, method: 'GET' });

    if (client) {
        for (const ep of endpoints) {
            try {
                console.log(`[Garmin Gear] Intentando: ${ep.url} (${ep.method}) con ID ${ep.body?.userProfileNumber || 'URL-path'}`);
                let data: any;
                if (ep.method === 'POST') {
                    data = await client.post(ep.url, ep.body, { headers: ep.headers });
                } else {
                    data = await client.get(ep.url);
                }

                if (data) {
                    const gearList: any[] = Array.isArray(data) ? data : (data.gear ?? data.gearList ?? data.gearItems ?? []);
                    if (gearList.length > 0) {
                        for (const item of gearList) {
                            await upsertGarminGear(userId, {
                                gearId: String(item.gearPk ?? item.gearId ?? item.uuid ?? ''),
                                displayName: item.displayName || item.customMakeModel || `${item.gearMakeName} ${item.gearModelName}` || 'Gear Garmin',
                                totalActivities: item.totalActivities ?? undefined,
                                totalDistance: item.totalDistance ?? undefined,
                                gearTypeName: item.gearTypeName ?? item.gearType?.typeKey ?? '',
                                createDate: item.createDate ? String(item.createDate).split('T')[0] : undefined
                            });
                        }
                        console.log(`[Garmin Gear] ${gearList.length} gear items sincronizados con cliente nativo.`);
                        return gearList;
                    }
                }
            } catch (err: any) {
                console.warn(`[Garmin Gear] Error en cliente nativo ${ep.url}: ${err.message}`);
            }
        }
    }

    // Fallback manual si el cliente falla
    const manualEndpoints = [
        { url: `https://connectapi.garmin.com/gear-service/gear/filterGear?userProfilePk=${idsToTry[0] || profileId}`, method: 'GET' },
        { url: `https://connect.garmin.com/gear-service/gear/filterGear?userProfileNumber=${profileId}&start=0&limit=100`, method: 'GET' },
        { url: `https://connect.garmin.com/modern/proxy/gear-service/gear/userProfileGear/${profileId}`, method: 'GET' },
        { url: `https://connect.garmin.com/gear-service/gear/userProfileGear/${profileId}`, method: 'GET' },
        { url: `https://connect.garmin.com/modern/proxy/gear-service/gear/filterGear?start=0&limit=100`, method: 'GET' }
    ];

    for (const ep of manualEndpoints as any[]) {
        try {
            console.log(`[Garmin Gear] Intentando manual: ${ep.url} (${ep.method})`);
            const resp = await fetch(ep.url, { 
                method: ep.method,
                headers: {
                    ...garminHeaders(accessToken),
                    ...(ep.method === 'POST' ? { 'Content-Type': 'application/json' } : {})
                },
                ...(ep.method === 'POST' ? { body: JSON.stringify(ep.body) } : {})
            });

            if (!resp.ok) {
                const errorText = await resp.text().catch(() => 'no body');
                console.warn(`[Garmin Gear] Manual HTTP ${resp.status} en ${ep.url}. Body: ${errorText.substring(0, 100)}`);
                continue;
            }

            const data = await resp.json() as any;
            const gearList: any[] = Array.isArray(data) ? data : (data.gear ?? data.gearList ?? data.gearItems ?? []);

            if (gearList.length > 0) {
                for (const item of gearList) {
                    await upsertGarminGear(userId, {
                        gearId: String(item.gearId ?? item.uuid ?? ''),
                        displayName: item.displayName ?? item.customMakeModel ?? 'Gear Garmin',
                        totalActivities: item.totalActivities ?? undefined,
                        totalDistance: item.totalDistance ?? undefined,
                        gearTypeName: item.gearTypeName ?? item.gearType?.typeKey ?? '',
                        createDate: item.createDate ? String(item.createDate).split('T')[0] : undefined
                    });
                }
                console.log(`[Garmin Gear] ${gearList.length} gear items sincronizados manualmente.`);
                return gearList;
            }
        } catch (err: any) {
            console.warn(`[Garmin Gear] Error en manual ${ep.url}: ${err.message}`);
        }
    }

    console.warn('[Garmin Gear] No se pudo obtener gear de ningún endpoint.');
    return [];
}

export async function syncGarmin(userId: string, overrideStartDateStr?: string): Promise<SyncResult> {
    try {
        // ─── 1. Cargar token OAuth desde Firestore ─────────────────────
        let accessToken: string | null = null;
        let garminClient: any = null;
        let parsedToken: any = null; // guardamos para poder refrescar si expira

        // Siempre leer credenciales (necesarias para el constructor GarminConnect)
        let creds: GarminCreds | null = null;
        try {
            creds = await getSecret<GarminCreds>(userId, 'garmin');
        } catch {
            console.warn('[Garmin] No se encontraron credenciales en Firestore.');
        }

        try {
            const oauthDoc = await db.collection('users').doc(userId)
                .collection('secrets').doc('garmin_oauth').get();

            if (oauthDoc.exists) {
                const tokenRaw = oauthDoc.data()?.token;
                if (tokenRaw && creds) {
                    const parsed = typeof tokenRaw === 'string' ? JSON.parse(tokenRaw) : tokenRaw;
                    parsedToken = parsed; // guardar referencia para auto-refresh
                    // parsed tiene forma { oauth1: { oauth_token, oauth_token_secret }, oauth2: { access_token, ... } }
                    accessToken = parsed.oauth2?.access_token || parsed.oauth2?.accessToken || null;

                    // El constructor requiere credenciales aunque usemos importToken.
                    // No llamamos .login() para evitar el bloqueo de Cloudflare en GCP.
                    const garminModule = await import('garmin-connect');
                    const GarminConnect = garminModule.GarminConnect
                        ?? (garminModule as any).default?.GarminConnect
                        ?? (garminModule as any).default;
                    garminClient = new GarminConnect({ username: creds.email, password: creds.password });
                    // Extender expires_at para que el cliente no intente refrescar el token
                    // (el access_token de Garmin dura ~1 año pese al expires_in corto del JWT)
                    const oauth2WithExtendedExpiry = {
                        ...parsed.oauth2,
                        expires_at: Math.floor(Date.now() / 1000) + 365 * 24 * 3600
                    };
                    garminClient.loadToken(parsed.oauth1, oauth2WithExtendedExpiry);
                    console.log('[Garmin] Token OAuth restaurado — cliente nativo listo.');
                    
                    try {
                        const profile = await garminClient.getUserProfile();
                        const profileId = String(profile?.profileId || 'unknown');
                        const userProfileNumber = String(profile?.id || 'unknown');
                        const garminGUID = String(profile?.garminGUID || 'unknown');
                        console.log(`[Garmin] Profile ID: ${profileId}, Number: ${userProfileNumber}, GUID: ${garminGUID}`);
                        
                        // Guardar en el contexto
                        (garminClient as any)._profileId = profileId;
                        (garminClient as any)._userProfileNumber = userProfileNumber;
                        (garminClient as any)._garminGUID = garminGUID;
                        
                        console.log(`[Garmin] Métodos disponibles: ${Object.keys(Object.getPrototypeOf(garminClient)).filter(m => !m.startsWith('_')).join(', ')}`);
                    } catch (pErr) {
                        console.warn('[Garmin] No se pudo obtener el perfil de usuario.');
                    }
                }
            }
        } catch (tokenErr: any) {
            console.warn(`[Garmin] No se pudo restaurar token OAuth: ${tokenErr.message}`);
        }

        // ─── 2. Fallback: login con email/password (IP local únicamente) ──
        if (!garminClient && !accessToken) {
            if (!creds) {
                return { added: 0, error: 'Sin credenciales ni token OAuth. Usa /garmin/set-token.' };
            }
            console.log('[Garmin] Sin token OAuth persistido — intentando login con credenciales...');
            try {
                const garminModule = await import('garmin-connect');
                const GarminConnect = garminModule.GarminConnect
                    ?? (garminModule as any).default?.GarminConnect
                    ?? (garminModule as any).default;
                garminClient = new GarminConnect({ username: creds.email, password: creds.password });
                await garminClient.login(creds.email, creds.password);
                console.log('[Garmin] Login exitoso con credenciales.');
                const exported = garminClient.exportToken?.();
                if (exported?.oauth2?.access_token) {
                    accessToken = exported.oauth2.access_token;
                }
            } catch (loginErr: any) {
                const msg = loginErr?.message || String(loginErr);
                console.error(`[Garmin] Login fallido: ${msg}`);
                return { added: 0, error: msg };
            }
        }

        if (!accessToken && !garminClient) {
            return { added: 0, error: 'No se pudo obtener access_token de Garmin. Usa /garmin/set-token para actualizar.' };
        }

        let lastActivityDate = new Date();
        let startDateStr = '';

        if (overrideStartDateStr) {
            startDateStr = overrideStartDateStr;
            lastActivityDate = new Date('2000-01-01'); // Force capture of all activities up to now
        } else {
            lastActivityDate = await getLastActivityDate(userId);
            startDateStr = lastActivityDate.toISOString().split('T')[0];
        }

        // ─── 3. ACTIVIDADES via fetch directo (Bearer OAuth2) ──────────
        let activitiesAdded = 0;
        if (accessToken) {
            const touchedDates = new Set<string>();
            try {
                const settings = await garminClient.getUserSettings();
                console.log(`[Garmin Debug] Settings: ${JSON.stringify(settings)}`);
                // Leer varias páginas para no perder actividades nuevas por ventanas cortas.
                const pageSize = 100;
                const maxPages = 5; // hasta 500 actividades recientes
                let activities: any[] = [];
                for (let page = 0; page < maxPages; page++) {
                    const chunk = await garminClient.getActivities(page * pageSize, pageSize);
                    const chunkArr: any[] = Array.isArray(chunk) ? chunk : [];
                    if (chunkArr.length === 0) break;
                    activities.push(...chunkArr);
                    if (chunkArr.length < pageSize) break;
                }
                console.log(`[Garmin Debug] Native Count (paged): ${activities?.length || 0}`);
                
                if (!activities || activities.length === 0) {
                    console.log('[Garmin Debug] Intentando fetch manual de actividades...');
                    const manualUrl = `https://connect.garmin.com/modern/proxy/activitylist-service/activities/search/activities?start=0&limit=20`;
                    try {
                        const manualData = await garminFetch(manualUrl, accessToken!);
                        activities = manualData?.activityList || manualData || [];
                        console.log(`[Garmin Debug] Manual Count: ${activities?.length || 0}`);
                    } catch (mErr: any) {
                        console.warn(`[Garmin Debug] Error en manual fetch activities: ${mErr.message}`);
                    }
                }
                
                if (activities && activities.length > 0) {
                    try {
                        const detail = await garminClient.getActivity({ activityId: activities[0].activityId });
                        console.log(`[Garmin Activity Detail JSON] ${JSON.stringify(detail)}`);
                    } catch (dErr: any) {
                        console.warn(`[Garmin Debug] Error en getActivity: ${dErr.message}`);
                    }
                }

                const batch = db.batch();
                let loggedFirst = false;
                for (const act of activities) {
                    if (!loggedFirst) {
                        console.log(`[Garmin Activity Detail JSON] ${JSON.stringify(act)}`);
                        loggedFirst = true;
                    }
                    if ((act as any).gearUuid || (act as any).gearName) {
                        console.log(`[Garmin Activity Gear] ${act.activityId}: ${(act as any).gearName} (${(act as any).gearUuid})`);
                    }
                    const actDate = new Date(act.startTimeGMT || act.startTimeLocal || 0);
                    if (actDate <= lastActivityDate) continue;

                    const docId = `garmin_${act.activityId}`;
                    const docRef = db.collection('users').doc(userId)
                        .collection('activities').doc(docId);
                    const existingSnap = await docRef.get();

                    const startDate = act.startTimeGMT
                        ? new Date(act.startTimeGMT)
                        : new Date(act.startTimeLocal);
                    const dateStr = startDate.toISOString().split('T')[0];
                    touchedDates.add(dateStr);
                    const record: any = {
                        activity_id: String(act.activityId),
                        name: act.activityName || 'Actividad Garmin',
                        type: act.activityType?.typeKey || 'unknown',
                        start_time: Timestamp.fromDate(startDate),
                        distance_km: act.distance != null ? +(act.distance / 1000).toFixed(3) : 0,
                        duration_min: act.duration != null ? +(act.duration / 60).toFixed(1) : 0,
                        avg_heart_rate: act.averageHR ?? null,
                        max_heart_rate: act.maxHR ?? null,
                        calories: act.calories ?? null,
                        elevation_gain: act.elevationGain ?? null,
                        avg_speed_kmh: act.averageSpeed != null ? +(act.averageSpeed * 3.6).toFixed(2) : null,
                        cadence_avg: act.averageRunningCadence ?? null,
                        vo2max: act.vO2MaxValue ?? null,
                        training_load: act.trainingLoad ?? act.trainingEffect ?? act.aerobicTrainingEffect ?? null,
                        aerobic_te: act.aerobicTrainingEffect ?? null,
                        anaerobic_te: act.anaerobicTrainingEffect ?? null,
                        source: 'garmin',
                        updated_at: FieldValue.serverTimestamp()
                    };

                    batch.set(docRef, record, { merge: true });
                    if (!existingSnap.exists) activitiesAdded++;

                    // NEW 2026: Sincronizar gear para esta actividad
                    if (garminClient) {
                        await syncActivityGear(userId, String(act.activityId), garminClient);
                    }
                }

                await batch.commit();
                console.log(`[Garmin] ${activitiesAdded} actividades nuevas guardadas.`);
            } catch (actErr: any) {
                if (actErr.message?.startsWith('TOKEN_INVALID')) {
                    console.warn('[Garmin] Token inválido — intentando renovación automática...');
                    const newToken = await garminRefreshToken(userId, parsedToken);
                    if (newToken) {
                        // Reintentar con el token renovado
                        try {
                            const url = `${GARMIN_BASE}/activitylist-service/activities/search/activities?start=0&limit=50&startDate=${startDateStr}`;
                            const data = await garminFetch(url, newToken);
                            const retryActivities: any[] = Array.isArray(data) ? data : (data.activityList || []);
                            const batch = db.batch();
                            for (const act of retryActivities) {
                                const docId = `garmin_${act.activityId}`;
                                const ref = db.collection('users').doc(userId).collection('activities').doc(docId);
                                const existingSnap = await ref.get();
                                
                                const record: any = {
                                    id: docId, source: 'garmin',
                                    activity_id: String(act.activityId),
                                    name: act.activityName || 'Actividad',
                                    type: (act.activityType?.typeKey || 'other').toLowerCase(),
                                    start_time: act.startTimeGMT
                                        ? Timestamp.fromDate(new Date(act.startTimeGMT))
                                        : (act.startTimeLocal ? Timestamp.fromDate(new Date(act.startTimeLocal)) : null),
                                    duration_min: act.duration ? Math.round(act.duration / 60) : null,
                                    distance_km: act.distance ? Math.round(act.distance / 10) / 100 : null,
                                    avg_heart_rate: act.averageHR || null,
                                    max_heart_rate: act.maxHR || null,
                                    calories: act.calories || null,
                                    training_load: act.trainingLoad ?? act.activityTrainingLoad ?? act.trainingEffect ?? act.aerobicTrainingEffect ?? null,
                                    aerobic_te: act.aerobicTrainingEffect ?? null,
                                    anaerobic_te: act.anaerobicTrainingEffect ?? null,
                                    elevation_gain: act.elevationGain || null,
                                    avg_speed_kmh: act.averageSpeed ? Math.round(act.averageSpeed * 3.6 * 100) / 100 : null,
                                    updated_at: FieldValue.serverTimestamp(),
                                };

                                batch.set(ref, record, { merge: true });
                                if (!existingSnap.exists) activitiesAdded++;

                                // NEW 2026: Sincronizar gear para esta actividad
                                if (garminClient) {
                                    await syncActivityGear(userId, String(act.activityId), garminClient);
                                }
                }
                await batch.commit();

                // Aplicar tags de carrera (trail/road) según `users/{uid}/races` para los días tocados.
                // Esto permite que `Carreras.xlsx` (importado a Firestore) se refleje en las activities correctas,
                // evitando asignar warmups cuando hay múltiples actividades el mismo día.
                try {
                    const { applyRaceTagsForDate } = await import('./race_tagging.js');
                    for (const d of touchedDates) {
                        await applyRaceTagsForDate(userId, d);
                    }
                } catch (raceErr: any) {
                    console.warn(`[Garmin] Race tagging skipped: ${raceErr.message || raceErr}`);
                }
                accessToken = newToken; // actualizar para los endpoints de wellness
            } catch (retryErr: any) {
                console.error(`[Garmin] Reintento tras refresh falló: ${retryErr.message}`);
                return { added: 0, error: 'token_invalid_after_refresh' };
            }
                    } else {
                        return { added: 0, error: 'token_invalid — ejecutar refresh-garmin-token.ts localmente' };
                    }
                } else {
                    console.error(`[Garmin] Error al obtener actividades: ${actErr.message}`);
                }
            }
        }

        // ─── 4. DAILY HEALTH — cliente nativo con OAuth1 ──────────────
        // Los endpoints de wellness (HRV, sueño, body battery, FC) requieren
        // OAuth1 firmado. El cliente nativo de garmin-connect lo maneja internamente.
        const today = new Date();
        let healthDaysAdded = 0;

        if (!garminClient) {
            console.warn('[Garmin] Sin cliente nativo — omitiendo daily_health sync.');
        } else {
            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const dateObj = new Date(dateStr); // objeto Date requerido por el cliente

                const healthRecord: any = {
                    date: dateStr,
                    source: 'garmin',
                    updated_at: FieldValue.serverTimestamp()
                };

                // HRV — via fetch directo (no existe método nativo en v1.6.2)
                if (accessToken) {
                    try {
                        const hrv = await garminFetch(`${GARMIN_BASE}/hrv-service/hrv/${dateStr}`, accessToken);
                        const summary = hrv?.hrvSummary;
                        if (summary) {
                            if (summary.lastNightAvg != null) healthRecord.hrv_value = summary.lastNightAvg;
                            if (summary.lastNight5MinHigh != null) healthRecord.hrv_5min_high = summary.lastNight5MinHigh;
                            if (summary.weeklyAvg != null) healthRecord.hrv_weekly_avg = summary.weeklyAvg;
                            if (summary.status != null) healthRecord.hrv_status = summary.status;
                        }
                    } catch (e: any) {
                        console.warn(`[Garmin] HRV ${dateStr}: ${e.message}`);
                    }
                }

                // Sueño — getSleepData(Date)
                try {
                    const sleep = await garminClient.getSleepData(dateObj);
                    const dto = sleep?.dailySleepDTO ?? sleep;
                    if (dto) {
                        if (dto.sleepTimeSeconds != null) healthRecord.sleep_hours = +(dto.sleepTimeSeconds / 3600).toFixed(2);
                        if (dto.deepSleepSeconds != null) healthRecord.sleep_deep_hours = +(dto.deepSleepSeconds / 3600).toFixed(2);
                        if (dto.remSleepSeconds != null) healthRecord.sleep_rem_hours = +(dto.remSleepSeconds / 3600).toFixed(2);
                    }
                    const scoreVal = sleep?.sleepScores?.overall?.value;
                    if (scoreVal != null) healthRecord.sleep_score = scoreVal;
                } catch (e: any) {
                    console.warn(`[Garmin] Sleep ${dateStr}: ${e.message}`);
                }

                // FC diaria (FC reposo) — getHeartRate(Date)
                try {
                    const hr = await garminClient.getHeartRate(dateObj);
                    // La respuesta puede venir como objeto raíz o dentro de dailyHeartRateDTO
                    const hrData = hr?.dailyHeartRateDTO ?? hr;
                    if (hrData?.restingHeartRate != null) healthRecord.resting_hr = hrData.restingHeartRate;
                    if (hrData?.maxHeartRate != null) healthRecord.max_hr = hrData.maxHeartRate;
                } catch (e: any) {
                    console.warn(`[Garmin] HeartRate ${dateStr}: ${e.message}`);
                }

                // Body Battery — fetch directo (no existe método nativo en v1.6.2)
                if (accessToken) {
                    try {
                        const bbData = await garminFetch(
                            `${GARMIN_BASE}/wellness-service/wellness/bodyBattery/reports/daily?startDate=${dateStr}&endDate=${dateStr}`,
                            accessToken
                        );
                        const entries: any[] = Array.isArray(bbData) ? bbData : (bbData?.bodyBatteryValuesArray ?? []);
                        if (entries.length > 0) {
                            const values = entries.map((e: any) => e.value ?? e[1]).filter((v: any) => v != null);
                            if (values.length > 0) {
                                healthRecord.body_battery_max = Math.max(...values);
                                healthRecord.body_battery_min = Math.min(...values);
                            }
                        }
                    } catch (e: any) {
                        console.warn(`[Garmin] BodyBattery ${dateStr}: ${e.message}`);
                    }
                }

                // Estrés — fetch directo (no existe método nativo en v1.6.2)
                if (accessToken) {
                    try {
                        const stressData = await garminFetch(
                            `${GARMIN_BASE}/wellness-service/wellness/dailyStress/${dateStr}`,
                            accessToken
                        );
                        if (stressData) {
                            if (stressData.avgStressLevel != null) healthRecord.stress_avg = stressData.avgStressLevel;
                            if (stressData.maxStressLevel != null) healthRecord.stress_max = stressData.maxStressLevel;
                        }
                    } catch (e: any) {
                        console.warn(`[Garmin] Stress ${dateStr}: ${e.message}`);
                    }
                }

                // Solo guardar si hay datos reales (más allá de los campos base)
                const hasData = Object.keys(healthRecord).some(
                    k => !['date', 'source', 'updated_at'].includes(k)
                );

                if (hasData) {
                    const docRef = db.collection('users').doc(userId)
                        .collection('daily_health').doc(dateStr);
                    await docRef.set(healthRecord, { merge: true });
                    healthDaysAdded++;
                }
            }
        }

        console.log(`[Garmin] ${healthDaysAdded} registros daily_health actualizados.`);

        // ─── 5. GEAR sync ──────────────────────────────────────────────
        if (accessToken) {
            await syncGarminGear(
                userId, 
                accessToken, 
                (garminClient as any)?._profileId, 
                garminClient, 
                (garminClient as any)?._userProfileNumber,
                (garminClient as any)?._garminGUID
            );
        }

        // Actualizar doc principal del usuario
        await db.collection('users').doc(userId).set(
            {
                lastUpdated: FieldValue.serverTimestamp(),
                lastGarminSync: new Date().toISOString()
            },
            { merge: true }
        );

        return { added: activitiesAdded, activitiesAdded, healthAdded: healthDaysAdded };

    } catch (err: any) {
        const msg = err?.message || String(err);
        console.error(`[Garmin] Error en sync: ${msg}`);
        return { added: 0, error: msg };
    }
}

