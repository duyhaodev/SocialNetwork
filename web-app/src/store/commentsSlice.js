import { createAsyncThunk, createSlice, createEntityAdapter } from "@reduxjs/toolkit";
import commentApi from "@/api/commentApi";
import likeApi from "../api/likeApi";
import { syncCommentCount } from "./postsSlice";

// 1. ENTITY ADAPTER SETUP
const commentsAdapter = createEntityAdapter({
  selectId: (comment) => comment.id,
});

// 2. ASYNC THUNKS
export const fetchCommentsByPost = createAsyncThunk(
  "comments/fetchByPost",
  async ({ postId, page = 0, size = 10 }, { rejectWithValue }) => {
    try {
      const res = await commentApi.getComments(postId, page, size);
      const data = res?.data?.result || res?.result || [];
      return { postId, page, size, data };
    } catch (err) {
      return rejectWithValue({
        postId,
        message: err?.response?.data?.message || "Load comments failed",
      });
    }
  }
);

export const createComment = createAsyncThunk(
  "comments/create",
  async ({ postId, content, mediaIds, parentId }, { rejectWithValue, dispatch }) => {
    try {
      const res = await commentApi.createComment({
        postId,
        content,
        parentId: parentId || null,
        mediaIds: mediaIds || []
      });

      // Tăng commentCount cho cả top-level comment lẫn reply (backend tính cả hai)
      dispatch(syncCommentCount({ postId, delta: +1 }));

      return { postId, data: res?.data?.result || res?.result };
    } catch (err) {
      return rejectWithValue({
        postId,
        message: err?.response?.data?.message || "Create comment failed",
      });
    }
  }
);

export const toggleCommentLike = createAsyncThunk(
  "comments/toggleCommentLike",
  async ({ postId, commentId }, { rejectWithValue }) => {
    try {
      const res = await likeApi.toggleComment(commentId);
      const data = res?.data?.result || res?.data || res;
      return { postId, commentId, ...data };
    } catch (err) {
      return rejectWithValue({
        postId,
        message: err?.response?.data?.message || "Toggle like comment failed",
      });
    }
  }
);

export const deleteComment = createAsyncThunk(
  "comments/delete",
  async ({ postId, commentId }, { rejectWithValue }) => {
    try {
      await commentApi.deleteComment(commentId);
      return { postId, commentId };
    } catch (err) {
      return rejectWithValue({
        postId,
        message: err?.response?.data?.message || "Delete comment failed",
      });
    }
  }
);

export const fetchReplies = createAsyncThunk(
  "comments/fetchReplies",
  async ({ commentId }, { rejectWithValue }) => {
    try {
      const res = await commentApi.getThread(commentId);
      const data = res?.result || res?.data?.result || [];
      return { commentId, data };
    } catch (err) {
      return rejectWithValue({
        commentId,
        message: err?.response?.data?.message || "Load replies failed",
      });
    }
  }
);

// 3. INITIAL STATE
const initialState = commentsAdapter.getInitialState({
  // Map postId to list of commentIds
  byPostId: {},
  loadingByPostId: {},
  errorByPostId: {},
  submittingByPostId: {},
  pageByPostId: {},
  hasMoreByPostId: {},

  // Map commentId to list of reply commentIds
  repliesByCommentId: {},
  loadingRepliesByCommentId: {},
});

// 4. SLICE
const commentsSlice = createSlice({
  name: "comments",
  initialState,
  reducers: {
    clearCommentsByPost(state, action) {
      const postId = action.payload;
      const commentIds = state.byPostId[postId] || [];
      commentsAdapter.removeMany(state, commentIds);
      
      delete state.byPostId[postId];
      delete state.loadingByPostId[postId];
      delete state.errorByPostId[postId];
      delete state.pageByPostId[postId];
      delete state.hasMoreByPostId[postId];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommentsByPost.pending, (state, action) => {
        const { postId } = action.meta.arg;
        state.loadingByPostId[postId] = true;
        state.errorByPostId[postId] = null;
      })
      .addCase(fetchCommentsByPost.fulfilled, (state, action) => {
        const { postId, page, size, data } = action.payload;
        state.loadingByPostId[postId] = false;
        
        commentsAdapter.upsertMany(state, data);
        const ids = data.map(c => c.id);

        if (page === 0) {
          state.byPostId[postId] = ids;
        } else {
          const prevList = state.byPostId[postId] || [];
          state.byPostId[postId] = [...prevList, ...ids];
        }
        
        state.pageByPostId[postId] = page;
        state.hasMoreByPostId[postId] = data.length === size;
      })
      .addCase(fetchCommentsByPost.rejected, (state, action) => {
        const postId = action.meta.arg?.postId;
        if (postId) {
          state.loadingByPostId[postId] = false;
          state.errorByPostId[postId] = action.payload?.message || "Error";
        }
      })
      .addCase(createComment.pending, (state, action) => {
        const { postId } = action.meta.arg;
        state.submittingByPostId[postId] = true;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        const { postId, data } = action.payload;
        state.submittingByPostId[postId] = false;
        if (data) {
          commentsAdapter.upsertOne(state, data);
          // Chỉ thêm vào top-level list nếu không phải reply
          if (!data.parentId) {
            const list = state.byPostId[postId] || [];
            state.byPostId[postId] = [data.id, ...list];
          }
        }
      })
      .addCase(toggleCommentLike.fulfilled, (state, action) => {
        const { commentId, liked, likeCount } = action.payload;
        if (state.entities[commentId]) {
          state.entities[commentId].likedByCurrentUser = !!liked;
          state.entities[commentId].likeCount = likeCount;
        }
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { postId, commentId } = action.payload;
        commentsAdapter.removeOne(state, commentId);
        if (state.byPostId[postId]) {
          state.byPostId[postId] = state.byPostId[postId].filter(id => id !== commentId);
        }
      })

      // fetchReplies
      .addCase(fetchReplies.pending, (state, action) => {
        const { commentId } = action.meta.arg;
        state.loadingRepliesByCommentId[commentId] = true;
      })
      .addCase(fetchReplies.fulfilled, (state, action) => {
        const { commentId, data } = action.payload;
        state.loadingRepliesByCommentId[commentId] = false;
        
        commentsAdapter.upsertMany(state, data);
        state.repliesByCommentId[commentId] = data.map(r => r.id);
      })
      .addCase(fetchReplies.rejected, (state, action) => {
        const { commentId } = action.meta.arg;
        state.loadingRepliesByCommentId[commentId] = false;
      });
  },
});

export const { clearCommentsByPost } = commentsSlice.actions;
export default commentsSlice.reducer;

// 5. SELECTORS
export const selectCommentsByPostId = (state, postId) => {
  const ids = state.comments.byPostId[postId] || [];
  return ids.map(id => state.comments.entities[id]).filter(Boolean);
};
export const selectCommentsLoadingByPostId = (state, postId) => !!state.comments.loadingByPostId[postId];
export const selectCommentsErrorByPostId = (state, postId) => state.comments.errorByPostId[postId];
export const selectCommentSubmittingByPostId = (state, postId) => !!state.comments.submittingByPostId[postId];
export const selectCommentsPageByPostId = (state, postId) => state.comments.pageByPostId[postId] ?? 0;
export const selectCommentsHasMoreByPostId = (state, postId) => state.comments.hasMoreByPostId[postId] ?? true;

export const selectRepliesByCommentId = (state, commentId) => {
  const ids = state.comments.repliesByCommentId[commentId] || [];
  return ids.map(id => state.comments.entities[id]).filter(Boolean);
};
export const selectRepliesLoadingByCommentId = (state, commentId) => !!state.comments.loadingRepliesByCommentId[commentId];