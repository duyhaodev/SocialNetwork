import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../store/userSlice";
import postsReducer from "../store/postsSlice";
import composerReducer from "../store/composerSlice";
import chatReducer from "../store/chatSlice";
import commentsReducer from "../store/commentsSlice";
import notificationsReducer from "../store/notificationsSlice";
import onlineUsersReducer from "../store/onlineUsersSlice";

const store = configureStore({
  reducer: {
    user: userReducer,
    posts: postsReducer,
    composer: composerReducer,
    chat: chatReducer,
    comments: commentsReducer,
    notifications: notificationsReducer,
    onlineUsers: onlineUsersReducer,
  },
});

export default store;