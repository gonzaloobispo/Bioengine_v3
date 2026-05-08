import { Logging } from '@google-cloud/logging';

const logging = new Logging(); // Auth is automatic in Cloud Functions

export async function getRecentLogs(limit: number = 15): Promise<string> {
    try {
        const options = {
            pageSize: limit,
            filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name="opengravity"',
            // In 2nd gen functions, the resource type is often cloud_run_revision
            orderBy: 'timestamp desc',
        };

        const [entries] = await logging.getEntries(options);

        if (!entries || entries.length === 0) {
            return "📭 No se encontraron logs recientes en Clean Logging.";
        }

        let output = "📋 **Logs Recientes:**\n\n";
        entries.forEach((entry) => {
            const date = new Date(entry.metadata.timestamp as string).toLocaleTimeString('es-UY');
            const severity = entry.metadata.severity || 'INFO';
            let message = "";

            if (typeof entry.data === 'string') {
                message = entry.data;
            } else if (entry.data && (entry.data as any).message) {
                message = (entry.data as any).message;
            } else {
                message = JSON.stringify(entry.data).slice(0, 100);
            }

            // Clean up common noisy logs
            if (message.includes('Function execution took')) return;
            if (message.includes('Function execution started')) return;

            output += `\`${date}\` [${severity}] ${message.slice(0, 150)}\n`;
        });

        return output;
    } catch (error: any) {
        console.error("Error fetching logs:", error);
        return `❌ Error al obtener logs: ${error.message}`;
    }
}
