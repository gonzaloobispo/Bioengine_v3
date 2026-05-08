/**
 * Plan Modification Tool — Firestore-native (Cloud-only)
 * Delegates directly to services/plans.ts — no Python backend dependency.
 */
import { modifyPlan as modifyPlanService } from '../services/plans.js';
import { getUserByTelegramId } from '../memory/db.js';

export interface PlanModificationArgs {
    action: 'SKIP' | 'MOVE' | 'REPLACE' | 'REDUCE' | 'ADD' | 'FREQUENCY';
    plan_id: number;
    session_idx?: number;
    date?: string;
    target_date?: string;
    exercise_id?: string;
    replacement_id?: string;
    replacements?: Array<{
        exercise_id: string;
        replacement_id: string;
        reason?: string;
    }>;
    reason?: string;
    force?: boolean;
    userId?: string;
}

export async function modifyPlan(args: PlanModificationArgs, extra?: { chatId?: string }) {
    try {
        // Resolve userId: prefer explicit, then look up by chatId, fallback to default
        let userId = args.userId;
        if (!userId && extra?.chatId) {
            const user = await getUserByTelegramId(extra.chatId);
            userId = user?.id || user?.userId || user?.uid;
        }
        if (!userId) throw new Error('userId requerido — no se encontró usuario para el chatId proporcionado');

        // Build a human-readable instruction from the structured args
        const action = args.action;
        const parts: string[] = [`Action: ${action}`];
        if (args.date) parts.push(`Date: ${args.date}`);
        if (args.target_date) parts.push(`Target date: ${args.target_date}`);
        if (args.session_idx !== undefined) parts.push(`Session index: ${args.session_idx}`);
        if (args.exercise_id) parts.push(`Exercise: ${args.exercise_id}`);
        if (args.replacement_id) parts.push(`Replacement: ${args.replacement_id}`);
        if (args.replacements?.length) parts.push(`Replacements: ${JSON.stringify(args.replacements)}`);
        if (args.reason) parts.push(`Reason: ${args.reason}`);
        const instruction = parts.join(' | ');

        // Get active plan id from Firestore — we need it to call modifyPlanService
        const { db } = await import('../memory/db.js');
        const plansSnap = await db.collection('users').doc(userId).collection('plans')
            .where('status', '==', 'active')
            .orderBy('updatedAt', 'desc')
            .limit(1)
            .get();

        let planId: string;
        if (!plansSnap.empty) {
            planId = plansSnap.docs[0].id;
        } else {
            // Fallback: most recent plan
            const snap2 = await db.collection('users').doc(userId).collection('plans')
                .orderBy('updatedAt', 'desc')
                .limit(1)
                .get();
            if (snap2.empty) throw new Error('No active plan found in Firestore for user ' + userId);
            planId = snap2.docs[0].id;
        }

        const result = await modifyPlanService(userId, planId, instruction, args.session_idx);

        return {
            success: true,
            status: 'modified',
            code: 'PLAN_MODIFIED',
            message: `Plan modificado exitosamente vía Firestore. Acción: ${action}`,
            plan_id: planId,
            session_idx: args.session_idx,
            full_result: result
        };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
