export async function getCurrentTimeTool(): Promise<{ currentTime: string }> {
    const currentTime = new Date().toISOString();
    return { currentTime };
}
