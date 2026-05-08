import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionHandler } from './action-handler.js';
import * as tools from '../tools/index.js';
import * as guardUtils from './guard-utils.js';

vi.mock('../tools/index.js', () => ({
    executeToolCall: vi.fn(),
}));

vi.mock('./guard-utils.js', () => ({
    checkPreActionGuard: vi.fn()
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

describe('ActionHandler', () => {
    let handler: ActionHandler;

    beforeEach(() => {
        vi.clearAllMocks();
        handler = new ActionHandler();
    });

    it('should block execution if Pre-Action Guard denies it', async () => {
        vi.mocked(guardUtils.checkPreActionGuard).mockResolvedValue(false);
        const toolCalls = [{ id: 'call_1', function: { name: 'dangerTool', arguments: '{}' } }] as any[];

        const results = await handler.handleToolCalls(toolCalls, 'chat-id');

        expect(results).toHaveLength(1);
        expect(results[0].content).toMatch(/Error: Action blocked by Pre-Action Guard/);
    });

    it('should execute tool and return result if Guard approves', async () => {
        vi.mocked(guardUtils.checkPreActionGuard).mockResolvedValue(true);
        vi.mocked(tools.executeToolCall).mockResolvedValue('{"success":true,"data":"ok"}');
        const toolCalls = [{ id: 'call_1', function: { name: 'safeTool', arguments: '{"foo":"bar"}' } }] as any[];

        const results = await handler.handleToolCalls(toolCalls, 'chat-id');

        expect(results).toHaveLength(1);
        expect(results[0].content).toBe('{"success":true,"data":"ok"}');
    });

    it('should catch errors from executeToolCall and return a polite error payload', async () => {
        vi.mocked(guardUtils.checkPreActionGuard).mockResolvedValue(true);
        vi.mocked(tools.executeToolCall).mockRejectedValue(new Error('Syntax Error'));
        const toolCalls = [{ id: 'call_1', function: { name: 'failingTool', arguments: '{}' } }] as any[];

        const results = await handler.handleToolCalls(toolCalls, 'chat-id');

        expect(results).toHaveLength(1);
        expect(results[0].content).toBe('Error: Syntax Error');
    });
});
