import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

export const ENV = {
    get TELEGRAM_BOT_TOKEN() { return process.env.TELEGRAM_BOT_TOKEN || ''; },
    TELEGRAM_ALLOWED_USER_IDS: (process.env.TELEGRAM_ALLOWED_USER_IDS || '').split(',').map(id => id.trim()),
    get GEMINI_API_KEY() { return process.env.GEMINI_API_KEY || ''; },
    get GROQ_API_KEY() { return process.env.GROQ_API_KEY || ''; }, // Used for audio transcription
    SERVICE_ACCOUNT_FILE: process.env.SERVICE_ACCOUNT_FILE || './service-account.json',
    get ELEVENLABS_API_KEY() { return process.env.ELEVENLABS_API_KEY || ''; },
    GOG_ACCOUNT: process.env.GOG_ACCOUNT || '',
    GOG_TIMEZONE: process.env.GOG_TIMEZONE || 'UTC',
    BIOENGINE_ADMIN_TOKEN: process.env.BIOENGINE_ADMIN_TOKEN || '',
    BIOENGINE_DASHBOARD_URL: process.env.BIOENGINE_DASHBOARD_URL || 'https://bioengine-v4.web.app',
    NLM_EXE_PATH: process.env.NLM_EXE_PATH || 'nlm',
    get OPENROUTER_API_KEY() { return process.env.OPENROUTER_API_KEY || ''; },
    APP_TITLE: process.env.APP_TITLE || 'BioEngine Coach V3',
    APP_URL: process.env.APP_URL || 'https://bioengine-v4.web.app',
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
};

// V4.5: Ensure GCP credentials are set for all Google Cloud SDKs to pick up.
// CRITICAL: Never overwrite credentials in GCP — ADC is provided automatically by the platform.
// Only set this in local development where a service account file is present.
const isGCP = !!(process.env.K_SERVICE || process.env.FUNCTION_TARGET || process.env.GCLOUD_PROJECT);
if (!isGCP && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const saPath = resolve(process.cwd(), ENV.SERVICE_ACCOUNT_FILE || 'service-account.json');
    if (fs.existsSync(saPath)) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;
    }
}

// Simple validation
export function validateConfig() {
    if (!ENV.TELEGRAM_BOT_TOKEN || ENV.TELEGRAM_BOT_TOKEN === 'SUSTITUYE POR EL TUYO') {
        throw new Error('TELEGRAM_BOT_TOKEN is missing or invalid in .env');
    }
    if (!ENV.GEMINI_API_KEY || ENV.GEMINI_API_KEY === 'SUSTITUYE POR EL TUYO') {
        throw new Error('GEMINI_API_KEY is missing or invalid in .env');
    }
    if (!ENV.TELEGRAM_ALLOWED_USER_IDS.length || ENV.TELEGRAM_ALLOWED_USER_IDS[0] === 'SUSTITUYE POR EL TUYO') {
        throw new Error('TELEGRAM_ALLOWED_USER_IDS is missing or invalid in .env');
    }
    console.log('Configuration validated successfully.');
}
