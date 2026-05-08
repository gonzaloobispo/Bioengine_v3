import * as functionsLogger from 'firebase-functions/logger';

/**
 * OpenGravity SRE Logger
 * Wraps Firebase Functions Logger to ensure structured logging with correlation IDs.
 * This is critical for tracing parallel Loki Mode workers.
 */

export class Logger {
    private correlationId?: string;
    private userId?: string;

    constructor(correlationId?: string, userId?: string) {
        this.correlationId = correlationId;
        this.userId = userId;
    }

    private formatMsg(msg: string, metadata?: any): any {
        return {
            message: msg,
            correlationId: this.correlationId,
            userId: this.userId,
            ...metadata
        };
    }

    info(msg: string, metadata?: any) {
        functionsLogger.info(this.formatMsg(msg, metadata));
        // Also print locally for development
        if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV !== 'production') {
            console.log(`[INFO]${this.correlationId ? `[${this.correlationId}]` : ''} ${msg}`, metadata || '');
        }
    }

    debug(msg: string, metadata?: any) {
        functionsLogger.debug(this.formatMsg(msg, metadata));
        if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV !== 'production') {
            console.debug(`[DEBUG]${this.correlationId ? `[${this.correlationId}]` : ''} ${msg}`, metadata || '');
        }
    }

    warn(msg: string, metadata?: any) {
        functionsLogger.warn(this.formatMsg(msg, metadata));
        if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV !== 'production') {
            console.warn(`[WARN]${this.correlationId ? `[${this.correlationId}]` : ''} ${msg}`, metadata || '');
        }
    }

    error(msg: string, error?: any, metadata?: any) {
        const payload = this.formatMsg(msg, metadata);
        if (error instanceof Error) {
            payload.errMessage = error.message;
            payload.stack = error.stack;
        } else if (error) {
            payload.errContext = error;
        }

        functionsLogger.error(payload);
        if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV !== 'production') {
            console.error(`[ERROR]${this.correlationId ? `[${this.correlationId}]` : ''} ${msg}`, error || '', metadata || '');
        }
    }
}

// Global logger instances (without context)
export const log = new Logger();

// Factory for turn-specific correlation
export function getLogger(turnId: string, userId?: string): Logger {
    return new Logger(turnId, userId);
}
