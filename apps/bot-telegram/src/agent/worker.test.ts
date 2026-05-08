import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processTurn } from './worker.js';
import * as state from '../memory/state.js';

// Mock everything from state and db
vi.mock('../memory/state.js', () => ({
    getTurn: vi.fn(),
    updateTurnStatus: vi.fn(),
    saveToolCallsToTurn: vi.fn(),
    saveToolResultsToTurn: vi.fn(),
    finishTurn: vi.fn()
}));

vi.mock('../memory/db.js', () => ({
    getMessages: vi.fn().mockResolvedValue([]),
    saveMessage: vi.fn(),
    getPendingDelegatedTasks: vi.fn().mockResolvedValue([])
}));

vi.mock('./llm.js', () => ({
    chatCompletion: vi.fn()
}));

vi.mock('../tools/index.js', () => ({
    toolDefinitions: [],
    executeToolCall: vi.fn()
}));

vi.mock('./guard-utils.js', () => ({
    checkPreActionGuard: vi.fn()
}));

vi.mock('./tts.js', () => ({
    generateSpeech: vi.fn()
}));

vi.mock('../utils/logger.js', () => {
    class MockLogger {
        constructor() { }
        info = vi.fn();
        error = vi.fn();
        warn = vi.fn();
        debug = vi.fn();
    }
    return {
        getLogger: vi.fn().mockReturnValue({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn()
        }),
        Logger: MockLogger,
        log: new MockLogger()
    };
});

describe('Worker - processTurn', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw an error if the turn is not found in the database', async () => {
        // Arrange
        vi.mocked(state.getTurn).mockResolvedValue(null);

        // Act & Assert
        await expect(processTurn('test-chat-id', 'test-turn-id'))
            .rejects
            .toThrow('[Worker] Turn test-turn-id not found.');

        expect(state.getTurn).toHaveBeenCalledWith('test-chat-id', 'test-turn-id');
    });

    it('should catch tool execution errors and send them to LLM instead of crashing', async () => {
        // Arrange
        const mockTurnTools = {
            id: 'test-turn-id',
            chatId: 'test-chat-id',
            status: 'PENDING_TOOLS',
            userMessage: '',
            wasVoiceRequest: false,
            toolCalls: [{ id: 'call_1', function: { name: 'failingTool', arguments: '{}' } }],
            toolResults: [],
            finalResponse: null
        } as any;

        const mockTurnLLM = {
            ...mockTurnTools,
            status: 'PENDING_LLM'
        };

        // First gets PENDING_TOOLS, then gets PENDING_LLM after state update
        vi.mocked(state.getTurn).mockResolvedValueOnce(mockTurnTools).mockResolvedValueOnce(mockTurnLLM);

        const { executeToolCall } = await import('../tools/index.js');
        vi.mocked(executeToolCall).mockRejectedValueOnce(new Error('Tool failed randomly'));

        const { chatCompletion } = await import('./llm.js');
        vi.mocked(chatCompletion).mockResolvedValueOnce({ content: 'I handled the error' } as any);

        const { checkPreActionGuard } = await import('./guard-utils.js');
        vi.mocked(checkPreActionGuard).mockResolvedValueOnce(true);

        // Act
        await processTurn('test-chat-id', 'test-turn-id');

        // Assert
        expect(state.saveToolResultsToTurn).toHaveBeenCalledWith(
            'test-chat-id',
            'test-turn-id',
            expect.arrayContaining([
                expect.objectContaining({
                    tool_call_id: 'call_1',
                    content: expect.stringContaining('Tool failed randomly')
                })
            ])
        );
    });

    it('should mark turn as FAILED if an unexpected error occurs during RECEIVED phase', async () => {
        const mockTurn = {
            id: 'test-turn-id',
            chatId: 'test-chat-id',
            status: 'RECEIVED',
            userMessage: 'Hello',
            wasVoiceRequest: false,
            toolCalls: [],
            toolResults: [],
            finalResponse: null
        } as any;

        vi.mocked(state.getTurn).mockResolvedValue(mockTurn);

        const db = await import('../memory/db.js');
        vi.mocked(db.saveMessage).mockRejectedValueOnce(new Error('DB failure'));

        const result = await processTurn('test-chat-id', 'test-turn-id');
        expect(result?.text).toMatch(/Error Crítico/);

        expect(state.updateTurnStatus).toHaveBeenCalledWith('test-chat-id', 'test-turn-id', 'FAILED', 'DB failure');
    });
});
