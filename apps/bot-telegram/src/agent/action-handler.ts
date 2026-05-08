import { Logger } from '../utils/logger.js';
import { executeToolCall } from '../tools/index.js';
import { checkPreActionGuard } from './guard-utils.js';

export class ActionHandler {
    private logger: Logger;
    constructor(logger?: Logger) {
        this.logger = logger || new Logger('ActionHandler');
    }

    async handleToolCalls(toolCalls: any[], chatId: string): Promise<any[]> {
        const results = [];
        this.logger.info(`Processing ${toolCalls.length} tool calls...`);

        for (const call of toolCalls) {
            const toolName = call.function.name;
            const args = JSON.parse(call.function.arguments);

            // Pre-Action Guard
            const isSafe = await checkPreActionGuard(toolName, args);
            if (!isSafe) {
                this.logger.warn(`Action blocked by Guard: ${toolName}`, { toolName, args });
                results.push({
                    tool_call_id: call.id,
                    role: 'tool',
                    name: toolName,
                    content: 'Error: Action blocked by Pre-Action Guard for safety reasons.'
                });
                continue;
            }

            try {
                this.logger.info(`Executing tool: ${toolName}`, { toolName, args });
                const output = await executeToolCall(call, { chatId });
                results.push({
                    tool_call_id: call.id,
                    role: 'tool',
                    name: toolName,
                    content: (typeof output === 'string' ? output : JSON.stringify(output)) ?? "Success."
                });
            } catch (error: any) {
                this.logger.error(`Tool execution failed: ${toolName}`, error, { toolName });
                results.push({
                    tool_call_id: call.id,
                    role: 'tool',
                    name: toolName,
                    content: `Error: ${error.message}`
                });
            }
        }
        return results;
    }
}
