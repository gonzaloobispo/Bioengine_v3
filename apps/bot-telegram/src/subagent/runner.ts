import { initDB, getDelegatedTask, updateDelegatedTaskStatus, saveMessage } from '../memory/db.js';
import { getPendingTurns, updateTurnStatus } from '../memory/state.js';
import { processTurn } from '../agent/worker.js';
import { CognitionHandler } from '../agent/cognition-handler.js';
import { ActionHandler } from '../agent/action-handler.js';
import { toolDefinitions } from '../tools/index.js';
import { Logger } from '../utils/logger.js';
import { sendSplitMessageToChatId, bot } from '../bot/telegram.js';
import { InputFile } from 'grammy';

const logger = new Logger('SubagentRunner');

async function runSubagent() {
    const taskId = process.argv[2];
    if (!taskId) {
        console.error("Usage: npx tsx src/subagent/runner.ts <task_id>");
        process.exit(1);
    }

    await initDB();
    const task = await getDelegatedTask(taskId);

    if (!task) {
        console.error(`Task ${taskId} not found.`);
        process.exit(1);
    }

    logger.info(`Starting Sub-agent for Task: ${task.taskName} (${taskId})`);
    await updateDelegatedTaskStatus(taskId, 'working');

    const cognition = new CognitionHandler();
    const action = new ActionHandler();

    const subagentChatId = `task_${taskId}`;
    const subagentSystemPrompt = `You are an OpenGravity Sub-agent specialized in: ${task.taskName}.
Your Objective: ${task.objective}
Context: ${task.context}

INSTRUCTIONS:
1. Work autonomously to fulfill the objective.
2. Use tools as needed.
3. Be rigorous and detailed.
4. When you are done, provide a clear and comprehensive Final Result.
5. Do NOT ask for user input. You must complete the task with the tools available.

IMPORTANT: Your final response MUST be a summary of everything you did and the results found.`;

    let history: any[] = [];
    let isComplete = false;
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (!isComplete && iterations < MAX_ITERATIONS) {
        iterations++;
        logger.info(`Iteration ${iterations} for task ${taskId}`);

        const response = await cognition.process({
            systemPrompt: subagentSystemPrompt,
            messages: history,
            tools: toolDefinitions
        });

        if (response.tool_calls && response.tool_calls.length > 0) {
            history.push({ role: 'assistant', content: null, tool_calls: response.tool_calls });

            const results = await action.handleToolCalls(response.tool_calls, subagentChatId);
            for (const res of results) {
                history.push({
                    role: 'tool',
                    tool_call_id: res.tool_call_id,
                    name: res.name,
                    content: res.content
                });
            }
        } else {
            // Task presumed complete
            const finalResult = response.content || "Task completed with no summary.";
            logger.info(`Task ${taskId} completed.`);
            await updateDelegatedTaskStatus(taskId, 'done', finalResult);

            // Log to main chat if needed (or just save specifically)
            await saveMessage('assistant', `[Sub-agent ${task.taskName} Finalizado]:\n${finalResult}`, task.chatId);

            isComplete = true;
        }
    }

    if (iterations >= MAX_ITERATIONS) {
        logger.error(`Task ${taskId} reached max iterations.`);
        await updateDelegatedTaskStatus(taskId, 'failed', 'Max iterations reached.');
    }

    // Attempt to wake up the main agent if it is waiting in AGENT_MONITOR state
    await wakeUpMainAgent(task.chatId);
}

async function wakeUpMainAgent(chatId: string) {
    logger.info(`Checking for sleeping AGENT_MONITOR turn for chatId ${chatId}...`);
    try {
        const pendingTurns = await getPendingTurns(chatId);
        const activeTurn = pendingTurns.find(t => t.status === 'AGENT_MONITOR');

        if (activeTurn) {
            logger.info(`Found sleeping AGENT_MONITOR turn ${activeTurn.id}, resuming...`);
            await updateTurnStatus(chatId, activeTurn.id, 'PENDING_LLM');

            // Resume the turn, this runs asynchronously but we can await it here
            const result = await processTurn(chatId, activeTurn.id);
            if (result && result.text) {
                await sendSplitMessageToChatId(chatId, result.text, { parse_mode: 'Markdown' });
            }
            if (result && result.voiceBuffer) {
                await bot.api.sendChatAction(chatId, 'upload_voice');
                await bot.api.sendVoice(chatId, new InputFile(result.voiceBuffer, 'response.ogg'));
            }
        } else {
            logger.info(`No AGENT_MONITOR turn found for chatId ${chatId}.`);
        }
    } catch (e: any) {
        logger.error(`Failed to wake up main agent for chatId ${chatId}:`, e);
    }
}

runSubagent().catch(err => {
    logger.error("Sub-agent runner failed", err);
    process.exit(1);
});
