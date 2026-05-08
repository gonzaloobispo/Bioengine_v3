import { db } from './db.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getLogger } from '../utils/logger.js';

export type TurnStatus = 'RECEIVED' | 'PENDING_LLM' | 'PENDING_TOOLS' | 'COMPLETED' | 'FAILED' | 'AGENT_MONITOR';

export interface ToolResult {
    toolCallId: string;
    name: string;
    result: string;
}

export interface ConversationTurn {
    id?: string;
    chatId: string;
    status: TurnStatus;
    userMessage: string;
    wasVoiceRequest: boolean;
    toolCalls: any[];
    toolResults: ToolResult[];
    finalResponse: string | null;
    createdAt?: any;
    updatedAt?: any;
    error?: string;
    telegramMessageId?: number; // Para poder editar mensajes asíncronamente
}

export async function createTurn(chatId: string, userMessage: string, wasVoiceRequest: boolean = false, telegramMessageId?: number): Promise<string> {
    const turnsRef = db.collection('chats').doc(chatId).collection('turns');
    const docRef = await turnsRef.add({
        chatId,
        status: 'RECEIVED',
        userMessage,
        wasVoiceRequest,
        toolCalls: [],
        toolResults: [],
        finalResponse: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        telegramMessageId: telegramMessageId || null
    });
    return docRef.id;
}

export async function getTurn(chatId: string, turnId: string): Promise<ConversationTurn | null> {
    const doc = await db.collection('chats').doc(chatId).collection('turns').doc(turnId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as ConversationTurn;
}

export async function updateTurnStatus(chatId: string, turnId: string, status: TurnStatus, error?: string): Promise<void> {
    const updateData: any = {
        status,
        updatedAt: FieldValue.serverTimestamp()
    };
    if (error) {
        updateData.error = error;
    }
    const logger = getLogger(turnId, chatId);
    logger.info(`State Transition: -> ${status}`, { status, error });
    await db.collection('chats').doc(chatId).collection('turns').doc(turnId).update(updateData);
}

export async function saveToolCallsToTurn(chatId: string, turnId: string, toolCalls: any[]): Promise<void> {
    const logger = getLogger(turnId, chatId);
    logger.info(`State Transition: -> PENDING_TOOLS`, { toolCallsCount: toolCalls.length });
    await db.collection('chats').doc(chatId).collection('turns').doc(turnId).update({
        toolCalls,
        status: 'PENDING_TOOLS',
        updatedAt: FieldValue.serverTimestamp()
    });
}

export async function saveToolResultsToTurn(chatId: string, turnId: string, toolResults: ToolResult[]): Promise<void> {
    const logger = getLogger(turnId, chatId);
    logger.info(`State Transition: -> PENDING_LLM`, { toolResultsCount: toolResults.length });
    await db.collection('chats').doc(chatId).collection('turns').doc(turnId).update({
        toolResults,
        status: 'PENDING_LLM', // Vuelve al LLM para procesar los resultados
        updatedAt: FieldValue.serverTimestamp()
    });
}

export async function finishTurn(chatId: string, turnId: string, finalResponse: string): Promise<void> {
    const logger = getLogger(turnId, chatId);
    logger.info(`State Transition: -> COMPLETED`, { finalResponseLength: finalResponse.length });
    const updateData: any = {
        finalResponse,
        status: 'COMPLETED',
        updatedAt: FieldValue.serverTimestamp()
    };
    await db.collection('chats').doc(chatId).collection('turns').doc(turnId).update(updateData);
}

export async function getPendingTurns(chatId: string): Promise<any[]> {
    const snapshot = await db.collection('chats').doc(chatId).collection('turns')
        .where('status', '==', 'AGENT_MONITOR')
        .get();

    return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        chatId: chatId,
        ...doc.data()
    }));
}
export async function saveVoiceUrl(chatId: string, turnId: string, voiceUrl: string): Promise<void> {
    const logger = getLogger(turnId, chatId);
    logger.info(`State Sync: Setting Voice URL -> ${voiceUrl.substring(0, 50)}...`);
    await db.collection('chats').doc(chatId).collection('turns').doc(turnId).update({
        voiceUrl,
        updatedAt: FieldValue.serverTimestamp()
    });
}
