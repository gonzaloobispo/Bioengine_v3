import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { ENV } from '../config.js';

const execAsync = promisify(exec);
const NLM_PATH = ENV.NLM_EXE_PATH;

/**
 * Checks if the NLM CLI is available in the current environment.
 */
function isNlmAvailable(): boolean {
    if (!NLM_PATH) return false;
    try {
        return fs.existsSync(NLM_PATH);
    } catch {
        return false;
    }
}

/**
 * Lists all available NotebookLM notebooks.
 */
export async function listNotebooks(): Promise<string> {
    if (!isNlmAvailable()) {
        return 'NotebookLM no está disponible en este entorno (Cloud). Usa las herramientas de investigación en la nube.';
    }

    try {
        const { stdout } = await execAsync(`"${NLM_PATH}" notebook list --json`, {
            timeout: 20000
        });
        
        const notebooks = JSON.parse(stdout);
        if (!notebooks || notebooks.length === 0) {
            return 'No se encontraron cuadernos en NotebookLM.';
        }
        return notebooks
            .map((nb: any) => `• ${nb.title} (ID: ${nb.id})`)
            .join('\n');
    } catch (error: any) {
        console.error('Error listing notebooks:', error.message);
        return `Error al listar cuadernos: ${error.message}`;
    }
}

/**
 * Queries a NotebookLM notebook with a natural language question.
 */
export async function queryNotebook(notebookId: string, question: string): Promise<string> {
    if (!isNlmAvailable()) {
        return 'NotebookLM no está disponible en este entorno (Cloud).';
    }

    try {
        const safeQuestion = question.replace(/"/g, "'").replace(/\n/g, ' ');
        const { stdout } = await execAsync(
            `"${NLM_PATH}" notebook query ${notebookId} "${safeQuestion}"`,
            { timeout: 60000 }
        );
        return stdout.trim() || 'El cuaderno no pudo responder la pregunta.';
    } catch (error: any) {
        console.error('Error querying notebook:', notebookId, error.message);
        const codeMsg = error.code === 'ETIMEDOUT' ? ' (Timeout 60s)' : '';
        return `Error al consultar el cuaderno${codeMsg}: ${error.message}`;
    }
}
