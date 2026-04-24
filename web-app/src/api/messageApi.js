
import axiosClient from "./axiosClient";

export const messageApi = {
    myConversations() {
        const url = "chat/conversations/my-conversations";
        return axiosClient.get(url);
    },

    createConversations({ participantIDs }) {
        const url = "chat/conversations/create";

        const payload = {
            participantIds: participantIDs,
            type: "DIRECT"
        }
        return axiosClient.post(url, payload)
    },

    getMessages(conversationId) {
        const url = `chat/messages/${conversationId}`;
        return axiosClient.get(url);
    },

    // Gửi tin nhắn mới
    sendMessage({ conversationId, content, media }) {
        const url = "chat/messages/create";
        const payload = {
            conversationId,
            content,
            media // [{id, url, type}]
        };
        return axiosClient.post(url, payload);
    },

    markConversationAsRead(conversationId) {
        const url = `chat/conversations/mark-as-read/${conversationId}`;
        return axiosClient.put(url);
    },

    createGroupConversation({ name, avatarUrl, participantIds }) {
        const url = "chat/conversations/group";
        const payload = {
            name,
            avatarUrl,
            participantIds,
            type: "GROUP"
        };
        return axiosClient.post(url, payload);
    },

    addParticipants(conversationId, userIds) {
        const url = `chat/conversations/${conversationId}/participants`;
        return axiosClient.post(url, userIds);
    },

    removeParticipant(conversationId, userId) {
        const url = `chat/conversations/${conversationId}/participants/${userId}`;
        return axiosClient.delete(url);
    },

    // Call APIs
    initiateCall({ calleeId, conversationId, type }) {
        const url = "chat/calls/initiate";
        return axiosClient.post(url, { calleeId, conversationId, type });
    },

    acceptCall(callId) {
        const url = `chat/calls/accept/${callId}`;
        return axiosClient.post(url);
    },

    rejectCall(callId) {
        const url = `chat/calls/reject/${callId}`;
        return axiosClient.post(url);
    },

    cancelCall(callId) {
        const url = `chat/calls/cancel/${callId}`;
        return axiosClient.post(url);
    },

    endCall(callId) {
        const url = `chat/calls/end/${callId}`;
        return axiosClient.post(url);
    }
}