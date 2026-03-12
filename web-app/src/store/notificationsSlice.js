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
      const newNotification = action.payload;
      // Thêm vào đầu danh sách
      state.items.unshift(newNotification);
      // Tăng số lượng chưa đọc
      state.unreadCount += 1;
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
    }
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

export const { receiveNotification, resetUnreadCount, updateNotificationItem } = notificationsSlice.actions;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotifications = (state) => state.notifications.items;

export default notificationsSlice.reducer;
