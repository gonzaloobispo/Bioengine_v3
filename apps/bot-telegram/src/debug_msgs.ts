import { initDB, getMessages } from './memory/db.js';

async function debug() {
    await initDB();
    const chatId = process.argv[2] || '8067043732';
    const msgs = await getMessages(10, chatId);
    const simplified = msgs.map(m => ({
        role: m.role,
        hasToolCall: !!m.tool_calls,
        hasToolResponse: !!m.tool_call_id,
        toolName: m.name,
        textContent: m.content ? m.content.substring(0, 50) + '...' : null
    }));
    console.log(JSON.stringify(simplified, null, 2));
}

debug();
