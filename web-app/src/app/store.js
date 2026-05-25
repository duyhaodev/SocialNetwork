import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../store/userSlice";
import postsReducer from "../store/postsSlice";
import composerReducer from "../store/composerSlice";
import chatReducer from "../store/chatSlice";
import commentsReducer from "../store/commentsSlice";
import notificationsReducer from "../store/notificationsSlice";
import onlineUsersReducer from "../store/onlineUsersSlice";
import callReducer from "../store/callSlice";
import storiesReducer from "../store/storySlice";

const store = configureStore({
  reducer: {
    user: userReducer,
    posts: postsReducer,
    composer: composerReducer,
    chat: chatReducer,
    comments: commentsReducer,
    notifications: notificationsReducer,
    onlineUsers: onlineUsersReducer,
    call: callReducer,
    stories: storiesReducer,
  },
});

export default store;