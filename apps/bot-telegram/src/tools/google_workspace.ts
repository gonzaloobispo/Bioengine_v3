import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';

const execPromise = promisify(exec);

/**
 * Tool to interact with Google Workspace using the 'gog' CLI.
 */
export async function googleWorkspace(command: string): Promise<string> {
    const isWindows = os.platform() === 'win32';
    const binPath = isWindows
        ? path.join(process.cwd(), 'bin', 'gog.exe')
        : path.join(process.cwd(), 'bin', 'gog_linux');

    // Use a writable directory for config (especially important in Cloud Functions)
    const configDir = isWindows
        ? path.join(os.homedir(), 'AppData', 'Roaming', 'gogcli')
        : path.join('/tmp', 'gogcli');

    const env: any = {
        ...process.env,
        GOG_COLOR: 'never',
        GOG_KEYRING_PASSWORD: 'opengravity' // Fixed password for non-interactive use
    };

    // On Linux (Cloud Functions), we force a custom HOME or XDG_CONFIG_HOME
    if (!isWindows) {
        env.HOME = '/tmp';
        env.XDG_CONFIG_HOME = '/tmp';
    }

    // Ensure the binary is executable on Linux
    if (!isWindows) {
        try {
            await execPromise(`chmod +x "${binPath}"`);
        } catch (e) { }
    }

    // Aggressively check if we need to initialize
    const credentialsPath = path.join(process.cwd(), 'gog_credentials');
    const keyringPath = path.join(configDir, 'keyring');
    const credentialsFile = path.join(configDir, 'credentials.json');

    // If we have local credentials but the config dir is empty or missing keyring, initialize
    if (fs.existsSync(credentialsPath) && (!fs.existsSync(credentialsFile) || !fs.existsSync(keyringPath))) {
        try {
            console.log('Initializing Google Workspace credentials in', configDir);
            // 1. Ensure directory exists
            if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
            // 2. Set keyring to file mode
            await execPromise(`"${binPath}" auth keyring file`, { env });
            // 3. Import credentials
            await execPromise(`"${binPath}" auth credentials "${path.join(credentialsPath, 'credentials.json')}"`, { env });
            // 4. Import token
            await execPromise(`"${binPath}" auth tokens import "${path.join(credentialsPath, 'token.json')}"`, { env });
        } catch (error: any) {
            console.error('Failed to initialize gog credentials:', error.message);
        }
    }

    // Set default account if not provided in command and available in env
    let finalCommand = command;
    if (process.env.GOG_ACCOUNT && !command.includes('-a ') && !command.includes('--account')) {
        // Find the service part (gmail, calendar, etc) and insert the account
        const parts = command.trim().split(' ');
        if (parts.length > 0) {
            const service = parts[0];
            const subCommand = parts.slice(1).join(' ');
            finalCommand = `${service} -a ${process.env.GOG_ACCOUNT} ${subCommand}`;
        }
    }

    // Execute the command
    const fullCommand = `"${binPath}" ${finalCommand} --json --no-input`;
    console.log('OpenGravity > GOG:', fullCommand);

    try {
        const { stdout, stderr } = await execPromise(fullCommand, { env });

        if (stderr && !stdout) {
            // Some "errors" might be just warnings, but if stdout is empty, return it.
            return JSON.stringify({ status: 'error', message: stderr });
        }

        return stdout || JSON.stringify({ status: 'success', message: 'Comando ejecutado con éxito' });
    } catch (error: any) {
        console.error('Google Workspace Tool Error:', error);
        return JSON.stringify({
            status: 'error',
            message: error.message,
            command_tried: fullCommand,
            tip: "Si falla la autenticación, verifica que los archivos en gog_credentials sean válidos y que el email sea correcto."
        });
    }
}
