import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { messageApi } from "../api/messageApi";

// Async thunk to fetch conversations
export const fetchConversations = createAsyncThunk(
  "chat/fetchConversations",
  async (_, { rejectWithValue }) => {
    try {
      const res = await messageApi.myConversations();
      const data = res.data || res;
      if (data && data.code === 1000 && Array.isArray(data.result)) {
        // Map API data to UI model immediately
        return data.result.map((c) => ({
          ...c,
          lastMessage: c.lastMessageContent || "",
          timestamp: c.lastMessageTimestamp || c.createdAt,
        }));
      }
      return [];
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Async thunk to mark conversation as read
export const markConversationRead = createAsyncThunk(
  "chat/markRead",
  async (conversationId, { rejectWithValue }) => {
    try {
      await messageApi.markConversationAsRead(conversationId);
      return conversationId;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    conversations: [],
    loading: false,
    isFetched: false,
    error: null,
    selectedConversationId: null,
    latestMessage: null, // Track the newest incoming message object
  },
  reducers: {
    // Action to handle incoming socket message
    receiveSocketMessage: (state, action) => {
      const message = action.payload;
      state.latestMessage = message; // Update latest message

      const index = state.conversations.findIndex(
        (c) => c.id === message.conversationId
      );

      if (index !== -1) {
        const isMe = message.me || message.isMe;
        // Logic: If message is not from me, mark unread (unless currently viewed - handled by component/thunk logic later, 
        // but for raw socket update, we set unread=true if not me. The UI opening the chat will trigger markRead)
        
        // Note: We don't know "selectedConversationId" perfectly here unless we track it in Redux. 
        // Assuming we track it in Redux (optional) or let the UI dispatch markRead when viewing.
        // For safety/simplicity: New msg from others = unread.
        
        const existingConv = state.conversations[index];
        const updatedConv = {
          ...existingConv,
          lastMessage: message.content,
          timestamp: message.createdAt,
          unread: !isMe || existingConv.unread,
        };

        // Remove from current position and add to top
        state.conversations.splice(index, 1);
        state.conversations.unshift(updatedConv);
      } else {
        // If conversation doesn't exist (new conversation started by someone else), 
        // we might need to fetch it or construct it. For now, we ignore or fetch all again.
        // Ideally: fetchConversations() could be triggered.
      }
    },
    
    // Action when user selects a conversation (to clear unread locally immediately)
    setConversationReadLocal: (state, action) => {
      const conversationId = action.payload;
      const index = state.conversations.findIndex((c) => c.id === conversationId);
      if (index !== -1) {
        state.conversations[index].unread = false;
      }
    },

    addNewConversation: (state, action) => {
        const newConv = action.payload;
        // Check if exists
        const exists = state.conversations.find(c => c.id === newConv.id);
        if (!exists) {
            state.conversations.unshift(newConv);
        }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Conversations
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.isFetched = true;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.isFetched = true;
        state.error = action.payload;
      })
      // Mark Read
      .addCase(markConversationRead.fulfilled, (state, action) => {
        const id = action.payload;
        const index = state.conversations.findIndex((c) => c.id === id);
        if (index !== -1) {
          state.conversations[index].unread = false;
        }
      });
  },
});

export const { receiveSocketMessage, setConversationReadLocal, addNewConversation } = chatSlice.actions;
export default chatSlice.reducer;
