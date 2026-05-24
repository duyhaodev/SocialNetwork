import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import notificationApi from "../api/notificationApi";

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const res = await notificationApi.getNotifications();
      // res cấu trúc: { activities: [], unreadCount: number }
      return res;
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to fetch notifications");
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllRead",
  async (_, { rejectWithValue }) => {
    try {
      await notificationApi.markAllRead();
      return;
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to mark all as read");
    }
  }
);

// Đồng bộ với NotificationService.getGroupedActivities ở backend
const groupKey = (n) => {
  const type = n.groupType || n.type;
  // Follow: KHÔNG gộp — mỗi notification 1 group riêng để có nút Follow back
  if (type === "follow") return `follow_${n.id}`;
  // Gộp theo postId
  if (type === "comment_post" || type === "like_post" || type === "repost") {
    return `${type}_post_${n.postId || "none"}`;
  }
  // Gộp theo commentId (parent comment với reply_comment)
  if (type === "reply_comment" || type === "like_comment") {
    return `${type}_comment_${n.commentId || "none"}`;
  }
  return `${type}_${n.postId || "none"}_${n.commentId || "none"}`;
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    receiveNotification: (state, action) => {
      const incoming = action.payload;
      if (!incoming) return;

      const key = groupKey(incoming);
      const existingIndex = state.items.findIndex((it) => groupKey(it) === key);

      if (existingIndex !== -1) {
        // Gộp: tăng count, prepend user mới (nếu chưa có), refresh createdAt
        const existing = state.items[existingIndex];
        const incomingUsers = incoming.users || (incoming.user ? [incoming.user] : []);
        const mergedUsers = [...incomingUsers];
        (existing.users || []).forEach((u) => {
          if (!mergedUsers.find((m) => m.id === u.id)) mergedUsers.push(u);
        });
        const updated = {
          ...existing,
          ...incoming,
          users: mergedUsers,
          count: mergedUsers.length,
          read: false,
        };
        state.items.splice(existingIndex, 1);
        state.items.unshift(updated);
      } else {
        const normalized = {
          ...incoming,
          users: incoming.users || (incoming.user ? [incoming.user] : []),
          count: incoming.count || 1,
        };
        state.items.unshift(normalized);
      }
      state.unreadCount += 1;
    },
    removeNotification: (state, action) => {
      const { id } = action.payload || {};
      if (!id) return;
      const idx = state.items.findIndex((it) => it.id === id);
      if (idx !== -1) {
        if (!state.items[idx].read && state.unreadCount > 0) state.unreadCount -= 1;
        state.items.splice(idx, 1);
      }
    },
    resetUnreadCount: (state) => {
      state.unreadCount = 0;
    },
    // Action này dùng khi người dùng follow back hoặc tương tác update lại 1 item cụ thể
    updateNotificationItem: (state, action) => {
      const { id, changes } = action.payload;
      const index = state.items.findIndex(item => item.id === id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...changes };
      }
    },
    // Đánh dấu trạng thái follow của 1 user trên TẤT CẢ follow notifications liên quan
    // Dùng khi user toggle follow ở bất kỳ đâu (UserHoverCard, profile, search...)
    markUserFollowed: (state, action) => {
      const { userId, followed } = action.payload || {};
      if (!userId) return;
      state.items.forEach((item) => {
        const type = item.groupType || item.type;
        if (type !== "follow") return;
        const matched = (item.users || []).some((u) => u.id === userId)
          || item.user?.id === userId
          || item.fromUserId === userId;
        if (matched) {
          item.followed = !!followed;
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.activities || [];
        state.unreadCount = action.payload.unreadCount || 0;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.unreadCount = 0;
        // Optional: Đánh dấu tất cả local items là đã đọc để UI update style (mờ đi)
        state.items.forEach(item => { item.read = true; });
      });
  },
});

export const { receiveNotification, removeNotification, resetUnreadCount, updateNotificationItem, markUserFollowed } = notificationsSlice.actions;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotifications = (state) => state.notifications.items;

export default notificationsSlice.reducer;
