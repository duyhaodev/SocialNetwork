import { createSlice } from "@reduxjs/toolkit";

const onlineUsersSlice = createSlice({
  name: "onlineUsers",
  initialState: {
    onlineIds: [], // Danh sách userId đang online
  },
  reducers: {
    // Cập nhật toàn bộ danh sách (dùng cho sự kiện online_users_list lúc mới connect)
    setOnlineUsers: (state, action) => {
      state.onlineIds = action.payload;
    },
    // Cập nhật trạng thái của 1 user (dùng cho sự kiện user_status_change)
    updateUserStatus: (state, action) => {
      const { userId, status } = action.payload;
      if (status === "online") {
        if (!state.onlineIds.includes(userId)) {
          state.onlineIds.push(userId);
        }
      } else {
        state.onlineIds = state.onlineIds.filter((id) => id !== userId);
      }
    },
  },
});

export const { setOnlineUsers, updateUserStatus } = onlineUsersSlice.actions;
export const selectOnlineIds = (state) => state.onlineUsers.onlineIds;
export default onlineUsersSlice.reducer;
