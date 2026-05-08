import { Logger } from '../utils/logger.js';
import { chatCompletion, LLMUsage } from './llm.js';
import { checkImpasse } from './impasse-detector.js'; // Assume it was refactored or kept in a helper

const logger = new Logger('CognitionHandler');

export interface LlmRequest {
    systemPrompt: string;
    messages: any[];
    tools: any[];
    onUsage?: (usage: LLMUsage) => void;
}

export class CognitionHandler {
    private logger: Logger;
    constructor(logger?: Logger) {
        this.logger = logger || new Logger('CognitionHandler');
    }

    async process(request: LlmRequest): Promise<any> {
        // Create full message array including system prompt
        const fullMessages = [
            { role: 'system', content: request.systemPrompt },
            ...request.messages
        ];

        this.logger.info('Calling LLM...', {
            messageCount: fullMessages.length,
            toolCount: request.tools.length
        });
        console.log('--- COGNITION CALLING CHAT COMP ---');
        const response = await chatCompletion(fullMessages, request.tools, undefined, request.onUsage);

        if (response.tool_calls) {
            this.logger.info('LLM Response: Tool Calls received.', {
                toolCalls: response.tool_calls.map((c: any) => c.function.name)
            });
        }
        return response;
    }
}
