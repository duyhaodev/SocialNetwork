import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { getAccessToken } from '../api/localStorageService';
import { receiveSocketMessage, receiveRevokeMessage, receiveEditMessage, markConversationRead, fetchConversations, receiveReactionUpdate, updateConversationAvatar } from '../store/chatSlice';
import { receiveNotification, removeNotification, updateNotificationItem } from '../store/notificationsSlice';
import { setOnlineUsers, updateUserStatus } from '../store/onlineUsersSlice';
import { receiveIncomingCall, setCallInProgress, endCallAction, setAnotherTabBusy } from '../store/callSlice';
import messageSound from '../assets/sounds/message-sound.wav';
import notificationSound from '../assets/sounds/notification-sound.mp3';
import { toast } from 'sonner';
import store from '../app/store';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.user);
  const { callStatus } = useSelector((state) => state.call);
  const { conversations, isFetched } = useSelector((state) => state.chat);

  // Cross-tab Synchronization using BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('call_channel');

    channel.onmessage = (event) => {
      if (event.data.type === 'BUSY_STATUS') {
        dispatch(setAnotherTabBusy(event.data.isBusy));
      } else if (event.data.type === 'QUERY_BUSY_STATUS') {
        // Khi tab khác hỏi "Có ai đang bận không?", nếu mình đang bận thì trả lời
        if (callStatus !== 'IDLE') {
          channel.postMessage({ type: 'BUSY_STATUS', isBusy: true });
        } else {
          // Mình đang IDLE → báo cho tab hỏi biết là không bận
          channel.postMessage({ type: 'BUSY_STATUS', isBusy: false });
        }
      }
    };

    // 1. Khi tab này thay đổi trạng thái cuộc gọi, báo cho các tab khác
    const isBusy = callStatus !== 'IDLE';
    channel.postMessage({ type: 'BUSY_STATUS', isBusy });

    // 2. Khi vừa mount (mở tab mới), hỏi xem có tab nào đang bận không
    channel.postMessage({ type: 'QUERY_BUSY_STATUS' });

    return () => {
      channel.close();
    };
  }, [callStatus, dispatch]);

  // Fetch conversations khi login để có danh sách rooms cần join
  useEffect(() => {
    if (isAuthenticated && !isFetched) {
      dispatch(fetchConversations());
    }
  }, [isAuthenticated, isFetched, dispatch]);

  // Join tất cả rooms toàn cục — không phụ thuộc vào trang nào đang mở
  // Giúp nhận realtime khi đang ở Feed, Profile, hay bất kỳ trang nào
  useEffect(() => {
    if (socket && conversations.length > 0) {
      conversations.forEach(conv => {
        if (conv.id) {
          socket.emit("join_room", conv.id);
        }
      });
    }
  }, [socket, conversations]);

  useEffect(() => {
    const token = getAccessToken();

    // Only connect if we have a token (user logged in)
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // If socket already exists and connected, don't recreate
    if (socket && socket.connected) return;

    // Initialize Socket
    const newSocket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:8089", {  // realtime-service socket.io port (rt-service.socket.port)
      query: { token },
      transports: ['websocket'], // Force websocket for better performance
      reconnection: true,
      extraHeaders: {
        "ngrok-skip-browser-warning": "true"
      }
    });

    newSocket.on("connect", () => {
      console.log("🟢 Socket Connected:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("🔴 Socket Disconnected");
    });

    // --- Online Status Listeners ---
    newSocket.on("online_users_list", (userIds) => {
      dispatch(setOnlineUsers(userIds));
    });

    newSocket.on("user_status_change", (data) => {
      dispatch(updateUserStatus(data));
    });

    // Khi được thêm vào nhóm mới → fetch lại conversations rồi join room
    newSocket.on("group_created", (conversation) => {
      try {
        dispatch(fetchConversations());
        if (conversation?.id) {
          newSocket.emit("join_room", conversation.id);
        }
      } catch (error) {
        console.error("Socket group_created handling error:", error);
      }
    });

    // Khi avatar nhóm thay đổi → update Redux cho tất cả thành viên
    newSocket.on("group_avatar_updated", (data) => {
      try {
        if (data?.conversationId && data?.avatarUrl) {
          dispatch(updateConversationAvatar({ conversationId: data.conversationId, avatarUrl: data.avatarUrl }));
        }
      } catch (error) {
        console.error("Socket group_avatar_updated handling error:", error);
      }
    });

    // Global Message Listener
    newSocket.on("message", (message) => {      try {
        // Data is already an object, no need to JSON.parse

        // Add currentUserId to message to help reducer determine isMe
        const state = store.getState();
        const currentUserId = state.user.profile?.id || state.user.profile?.userId;
        const enrichedMessage = {
          ...message,
          currentUserId
        };

        // Dispatch to Redux -> Updates MessagePage & Popup
        dispatch(receiveSocketMessage(enrichedMessage));

        // Check if conversation exists in Redux Store
        const exists = state.chat.conversations.some(c => c.id === message.conversationId);
        if (!exists) {
          dispatch(fetchConversations());
        }

        // Play notification sound if message is incoming (not from me)
        const senderId = message.sender?.id || message.senderId;
        const isMe = senderId === currentUserId;
        if (!isMe) {
          const audio = new Audio(messageSound);
          audio.play().catch(e => console.warn("Audio play failed:", e));
        }
      } catch (error) {
        console.error("Socket message handling error:", error);
      }
    });

    // Global Message Revoke Listener
    newSocket.on("message_revoked", (data) => {
      try {
        console.log("Message revoked:", data);
        dispatch(receiveRevokeMessage(data));
      } catch (error) {
        console.error("Socket message_revoked handling error:", error);
      }
    });

    // Global Message Edit Listener
    newSocket.on("message_edited", (data) => {
      try {
        console.log("Message edited:", data);
        dispatch(receiveEditMessage(data));
      } catch (error) {
        console.error("Socket message_edited handling error:", error);
      }
    });

    // Global Message Reaction Listener
    newSocket.on("message_reaction_updated", (data) => {
      try {
        console.log("Message reaction updated:", data);
        dispatch(receiveReactionUpdate(data));
      } catch (error) {
        console.error("Socket message_reaction_updated handling error:", error);
      }
    });

    // Global Notification Listener
    newSocket.on("new_notification", (notification) => {
      try {
        // Play notification sound
        const audio = new Audio(notificationSound);
        audio.play().catch(e => console.warn("Audio play failed:", e));

        // Dispatch to Redux
        dispatch(receiveNotification(notification));

        // Display toast notification dạng "A và n người khác ..."
        const firstName = notification.user?.displayName || notification.user?.username || "Someone";
        const others = (notification.count || 1) - 1;
        const headline = others > 0
          ? `${firstName} and ${others} other${others > 1 ? "s" : ""} ${notification.message}`
          : `${firstName} ${notification.message}`;

        toast.info(headline, {
          description: notification.user ? `@${notification.user.username}` : '',
          duration: 3000,
        });

      } catch (error) {
        console.error("Socket notification handling error:", error);
      }
    });

    // Gỡ thông báo realtime khi user kia hủy hành động (unrepost / delete comment / unfollow / unlike ...)
    newSocket.on("remove_notification", (payload) => {
      try {
        dispatch(removeNotification(payload));
      } catch (error) {
        console.error("Socket remove_notification handling error:", error);
      }
    });

    // Đánh dấu noti follow đã resolved (user follow back) — chỉ update field, không xóa
    newSocket.on("resolve_notification", (payload) => {
      try {
        const { id, ...changes } = payload || {};
        if (id) {
          dispatch(updateNotificationItem({ id, changes }));
        }
      } catch (error) {
        console.error("Socket resolve_notification handling error:", error);
      }
    });

    // --- Call Listeners ---
    newSocket.on("incoming_call", (data) => {
      console.log("Incoming call:", data);
      // Reset isAnotherTabBusy trước khi nhận cuộc gọi mới
      // để tránh trường hợp bị stuck true từ session trước
      dispatch(setAnotherTabBusy(false));
      dispatch(receiveIncomingCall(data));
    });

    newSocket.on("call_accepted", (data) => {
      console.log("Call accepted:", data);
      dispatch(setCallInProgress(data));
    });

    newSocket.on("call_rejected", (data) => {
      console.log("Call rejected:", data);
      dispatch(endCallAction(data));
    });

    newSocket.on("call_cancelled", (data) => {
      console.log("Call cancelled:", data);
      dispatch(endCallAction(data));
    });

    newSocket.on("call_ended", (data) => {
      console.log("Call ended:", data);
      dispatch(endCallAction(data));
    });

    // Save socket instance
    setSocket(newSocket);

    // Cleanup on unmount or logout
    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, dispatch]); // Re-run when auth status changes

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
