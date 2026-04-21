
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
    sendMessage({ conversationId, content }) {
        const url = "chat/messages/create";
        const payload = {
            conversationId,
            content
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
    }
}