import { Logger } from '../utils/logger.js';
import { chatCompletion } from './llm.js';
import { saveMemory } from '../memory/db.js';

const logger = new Logger('MemoryHandler');

const MEMORY_PROMPT = `Analyze the following conversation segment and extract key learnings about the user's preferences, project status, or critical facts.
Format your response as a JSON object with keys as the learning identifiers and values as the content.
If no relevant info is found, return an empty object {}.
Example: {"user_email": "gonzalo.obispo@gmail.com", "fav_framework": "Next.js"}`;

export class MemoryHandler {
    private logger: Logger;
    constructor(logger?: Logger) {
        this.logger = logger || new Logger('MemoryHandler');
    }

    async processLearnings(messages: any[]): Promise<void> {
        try {
            this.logger.info('Extracting learnings from interaction...');

            // Use a recent window for extraction
            const window = messages.slice(-4);
            const extractionResult = await chatCompletion([
                { role: 'system', content: MEMORY_PROMPT },
                ...window
            ], undefined, "gemini-2.5-flash-lite"); // Use fast model for utility task

            if (extractionResult.content) {
                try {
                    // Remove potential markdown code blocks
                    const jsonString = extractionResult.content.replace(/```json\n?|```/g, '').trim();
                    const learnings = JSON.parse(jsonString);
                    for (const [key, value] of Object.entries(learnings)) {
                        this.logger.info(`Saving learning: ${key}`, { key, value });
                        await saveMemory(key, value as string);
                    }
                } catch (parseErr) {
                    this.logger.warn('Failed to parse learnings JSON', { content: extractionResult.content });
                }
            }
        } catch (err) {
            this.logger.error('MemoryHandler Error:', err);
        }
    }
}
