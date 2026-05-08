import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/logger.js';

const execAsync = promisify(exec);
const logger = new Logger('ImpasseDetector');

export async function checkImpasse(messages: any[]): Promise<{ isImpasse: boolean; reason?: string }> {
    try {
        const transcript = JSON.stringify(messages.slice(-3)).replace(/"/g, '`"');
        const { stdout } = await execAsync(`pwsh -File bin/impasse_check.ps1 -Transcript "${transcript}"`);
        const result = JSON.parse(stdout);
        return {
            isImpasse: result.isImpasse === true,
            reason: result.reason
        };
    } catch (err) {
        logger.error('Impasse check error', err);
        return { isImpasse: false }; // Fail open for the impasse check to avoid blocking progress unless sure
    }
}
