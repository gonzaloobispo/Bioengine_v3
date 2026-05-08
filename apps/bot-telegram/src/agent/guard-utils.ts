import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/logger.js';

const execAsync = promisify(exec);
const logger = new Logger('GuardUtils');

export async function checkPreActionGuard(toolName: string, args: any): Promise<boolean> {
    // SENSITIVE_TOOLS definition moved here or imported
    const SENSITIVE_TOOLS = ['google_workspace', 'fs_write', 'fs_delete'];
    const DESTRUCTIVE_KEYWORDS = ['delete', 'remove', 'rm ', 'format', 'overwrite'];

    const argsStr = JSON.stringify(args).toLowerCase();
    const hasDestructive = DESTRUCTIVE_KEYWORDS.some(kw => argsStr.includes(kw));

    if (SENSITIVE_TOOLS.includes(toolName) || hasDestructive) {
        logger.info(`Triggering Pre-Action Guard for ${toolName}...`);
        try {
            const { stdout } = await execAsync(`pwsh -File bin/guard_check.ps1 -Action "${toolName}" -Context "${argsStr.replace(/"/g, '`"')}"`);
            const result = JSON.parse(stdout);
            return result.allowed === true;
        } catch (err) {
            logger.error('Guard execution error, defaulting to BLOCK', err);
            return false;
        }
    }
    return true;
}
