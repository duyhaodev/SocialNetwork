import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { messageApi } from "../../api/messageApi";
import { ConversationSidebar } from "./components/ConversationSidebar";
import { ChatWindow } from "./components/ChatWindow";
import { useDispatch, useSelector } from "react-redux";
import { fetchConversations, markConversationRead, receiveSocketMessage, addNewConversation } from "../../store/chatSlice";


export function MessagesPage({ onBack }) {
  const dispatch = useDispatch();
  const { conversations, loading: conversationsLoading, latestMessage } = useSelector(state => state.chat);
  
  const [selectedConversation, setSelectedConversation] = useState(null);
  
  // Use Ref to track selected conversation
  const selectedConversationRef = useRef(selectedConversation);

  const location = useLocation();
  const navigate = useNavigate();

  const shouldShowBack = Boolean(onBack || location.state?.fromPopup);
  const handleBack = onBack ? onBack : () => navigate(-1);

  // Sync ref with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Load conversations on mount if empty
  useEffect(() => {
    if (conversations.length === 0) {
        dispatch(fetchConversations());
    }
  }, [dispatch, conversations.length]);

  // Handle auto-select from state (e.g. click from popup)
  useEffect(() => {
    if (location.state?.selectedId && conversations.length > 0 && !selectedConversation) {
        const target = conversations.find(c => c.id === location.state.selectedId);
        if (target) {
            handleConversationSelected(target);
            // Clear state to prevent re-selection on refresh (optional)
            window.history.replaceState({}, document.title);
        }
    } else if (conversations.length > 0 && !selectedConversation && !location.state?.selectedId) {
        // Default select first
        handleConversationSelected(conversations[0]);
    }
  }, [conversations, location.state]);

  // Watch for latestMessage to Auto-Mark Read if viewing that conversation
  useEffect(() => {
    if (!latestMessage) return;

    const currentSelectedId = selectedConversationRef.current?.id;
    const isMe = latestMessage.me || latestMessage.isMe;

    // If new message is for the currently open conversation and NOT from me -> Mark read
    if (!isMe && latestMessage.conversationId === currentSelectedId) {
        dispatch(markConversationRead(latestMessage.conversationId));
    }
  }, [latestMessage, dispatch]);

  // Handle creating/selecting a conversation from search results
  const handleSelectSearchUser = async (user) => {
    // Optimistic temp conversation
    const tempConversation = {
      id: `temp_${user.id}`,
      user: {
        displayName: user.fullName || user.userName,
        avatar: user.avatarUrl,
      },
      lastMessage: "Bắt đầu cuộc trò chuyện",
      unread: false,
      timestamp: new Date().toISOString(),
    };

    setSelectedConversation(tempConversation);

    try {
      const res = await messageApi.createConversations({ participantIDs: [user.id] });
      const data = res.data || res;

      if (data && (data.code === 1000 || data.code === 200) && data.result) {
        const conv = Array.isArray(data.result) ? data.result[0] : data.result;

        const created = {
          id: conv.id,
          user: {
            displayName: conv.conversationName || (user.fullName || user.userName),
            avatar: conv.conversationAvatar || user.avatarUrl,
          },
          lastMessage: conv.lastMessageContent || "Bắt đầu cuộc trò chuyện",
          unread: conv.unread || false,
          timestamp: conv.lastMessageTimestamp || conv.createdAt || new Date().toISOString(),
          conversationName: conv.conversationName || (user.fullName || user.userName),
          conversationAvatar: conv.conversationAvatar || user.avatarUrl,
        };

        // Add to Redux
        dispatch(addNewConversation(created));
        setSelectedConversation(created);
      }
    } catch (err) {
      console.error("❌ createConversations error:", err);
    }
  };

  const handleConversationSelected = (conv) => {
    // Standardize object structure if needed
    const adaptedConv = {
        ...conv,
        user: {
            displayName: conv.conversationName || conv.user?.displayName,
            avatar: conv.conversationAvatar || conv.user?.avatar
        }
    };
    
    setSelectedConversation(adaptedConv);

    if (conv.unread) {
      dispatch(markConversationRead(conv.id));
    }
  };

  // Callback when a message is sent in ChatWindow
  const handleSendMessageSuccess = (newMsg) => {
    // Update Redux
    dispatch(receiveSocketMessage(newMsg));
  };

  return (
    <div className="flex h-screen bg-black text-white">
      <ConversationSidebar
        conversations={conversations}
        loading={conversationsLoading}
        selectedId={selectedConversation?.id}
        onSelectConversation={handleConversationSelected}
        onSearchSelect={handleSelectSearchUser}
        onBack={handleBack}
        shouldShowBack={shouldShowBack}
      />
      
      <ChatWindow
        conversation={selectedConversation}
        onSendMessageSuccess={handleSendMessageSuccess}
        incomingMessage={latestMessage} 
      />
    </div>
  );
}
