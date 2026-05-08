import { ENV } from '../config.js';
import { log } from '../utils/logger.js';

/**
 * Genera voz usando ElevenLabs (nativo cloud).
 * Si no hay clave ElevenLabs, devuelve undefined de forma silenciosa.
 */
export async function generateSpeech(text: string): Promise<Buffer | undefined> {
    if (!ENV.ELEVENLABS_API_KEY) {
        log.warn('[TTS] ELEVENLABS_API_KEY no configurada — voz desactivada.');
        return undefined;
    }

    try {
        log.info(`[TTS] Solicitando voz para ${text.length} caracteres vía ElevenLabs...`);

        // Voice ID: Rachel (multilingual, buena para español)
        const voiceId = '21m00Tcm4TlvDq8ikWAM';
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'xi-api-key': ENV.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error body');
            log.error(`[TTS] Error en ElevenLabs API (${response.status}): ${errorText}`);
            return undefined;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        log.info(`[TTS] Voz generada exitosamente. Tamaño: ${buffer.length} bytes`);
        return buffer;
    } catch (error: any) {
        log.error('[TTS] Excepción en generación de voz:', error.message || error);
        return undefined;
    }
}
