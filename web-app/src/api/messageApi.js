
import axiosClient from "./axiosClient";

export const messageApi = {
    myConversations () {
        const url = "conversations/my-conversations";
        return axiosClient.get(url);
    },

    createConversations ({ participantIDs }) {
        const url = "conversations/create";

        const payload = {
            participantIds: participantIDs,
            type: "DIRECT"
        }
        return axiosClient.post(url, payload)
    },

    getMessages(conversationId) {
        const url = "messages/my-conversations";
        return axiosClient.get(url, {
            params: { conversationId }
        });
    },
    
    // Gửi tin nhắn mới
    sendMessage({ conversationId, content }) {
        const url = "messages/create";
        const payload = {
            conversationId,
            content
        };
        return axiosClient.post(url, payload);
    },

    markConversationAsRead(conversationId) {
        const url = `conversations/mark-as-read/${conversationId}`;
        return axiosClient.put(url);
    }
}