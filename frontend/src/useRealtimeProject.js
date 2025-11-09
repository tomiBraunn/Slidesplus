// @ts-nocheck
export const useRealtimeCollaboration = (
    projectId,
    currentUserId,
    username,
    firstName,
    lastName,
    avatar
) => {
    return {
        activeUsers: [],
        lastChange: null,
        chatMessages: [],
        cursors: [],
        isConnected: false,
        updatePresence: () => {},
        updateCursor: () => {},
        broadcastChange: () => {},
        sendChatMessage: () => {},
        clearLastChange: () => {}
    }
}
