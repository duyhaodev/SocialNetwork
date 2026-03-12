import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import commentApi from "@/api/commentApi";
import likeApi from "../api/likeApi";

export const fetchCommentsByPost = createAsyncThunk(
  "comments/fetchByPost",
  async ({ postId, page = 0, size = 10 }, { rejectWithValue }) => {
    try {
      const res = await commentApi.getComments(postId, page, size);
      return { postId, page, size, data: res || [] };
    } catch (err) {
      return rejectWithValue({
        postId,
        message: err?.message || "Load comments failed",
      });
    }
  }
);

export const createComment = createAsyncThunk(
  "comments/create",
  async ({ postId, formData }, { rejectWithValue }) => {
    try {
      const res = await commentApi.createComment(postId, formData);
      return { postId, data: res };
    } catch (err) {
      return rejectWithValue({
        postId,
        message: err?.message || "Create comment failed",
      });
    }
  }
);

export const toggleCommentLike = createAsyncThunk(
  "comments/toggleCommentLike",
  async ({ postId, commentId }, { rejectWithValue }) => {
    try {
      const res = await likeApi.toggleComment(commentId);
      const data = res?.data || res;
      return { postId, commentId, ...data }; // { postId, commentId, liked, likeCount }
    } catch (err) {
      return rejectWithValue({
        postId,
        message: err?.message || "Toggle like comment failed",
      });
    }
  }
);



const initialState = {
  byPostId: {},            // { [postId]: Comment[] }
  loadingByPostId: {},     // { [postId]: boolean }
  errorByPostId: {},       // { [postId]: string | null }
  submittingByPostId: {},  // { [postId]: boolean }
  pageByPostId: {},        // { [postId]: number } // trang hiện tại
  hasMoreByPostId: {},     // { [postId]: boolean }
};

const commentsSlice = createSlice({
  name: "comments",
  initialState,
  reducers: {
    clearCommentsByPost(state, action) {
      const postId = action.payload;
      delete state.byPostId[postId];
      delete state.loadingByPostId[postId];
      delete state.errorByPostId[postId];
      delete state.submittingByPostId[postId];
      delete state.pageByPostId[postId];
      delete state.hasMoreByPostId[postId];
    },
    syncCommentLike(state, action) {
      const { postId, commentId, liked, likeCount } = action.payload || {};
      if (!postId || !commentId) return;

      const list = state.byPostId?.[postId] || [];
      const c = list.find((x) => x.id === commentId);
      if (!c) return;

      c.likedByCurrentUser = !!liked;
      c.likeCount = likeCount ?? c.likeCount ?? 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // ===== fetchCommentsByPost =====
      .addCase(fetchCommentsByPost.pending, (state, action) => {
        const { postId } = action.meta.arg;
        state.loadingByPostId[postId] = true;
        state.errorByPostId[postId] = null;
      })
      .addCase(fetchCommentsByPost.fulfilled, (state, action) => {
        const { postId, page, size, data } = action.payload;
        state.loadingByPostId[postId] = false;
        const prevList = state.byPostId[postId] || [];
        if (page === 0) {
          state.byPostId[postId] = data;
        } else {
          state.byPostId[postId] = [...prevList, ...data];
        }
        state.pageByPostId[postId] = page;
        state.hasMoreByPostId[postId] = data.length === size;
      })
      .addCase(fetchCommentsByPost.rejected, (state, action) => {
        const postId = action.payload?.postId || action.meta.arg?.postId;
        if (!postId) return;
        state.loadingByPostId[postId] = false;
        state.byPostId[postId] = state.byPostId[postId] || [];
        state.errorByPostId[postId] =
          action.payload?.message || "Load comments failed";
      })

      // ===== createComment =====
      .addCase(createComment.pending, (state, action) => {
        const { postId } = action.meta.arg;
        state.submittingByPostId[postId] = true;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        const { postId, data } = action.payload;
        state.submittingByPostId[postId] = false;
        const list = state.byPostId[postId] || [];
        state.byPostId[postId] = [data, ...list];
      })
      .addCase(createComment.rejected, (state, action) => {
        const postId = action.payload?.postId || action.meta.arg?.postId;
        if (postId) {
          state.submittingByPostId[postId] = false;
          state.errorByPostId[postId] =
            action.payload?.message || "Create comment failed";
        }
      })
      
      // ===== toggleCommentLike =====
      .addCase(toggleCommentLike.fulfilled, (state, action) => {
        const { postId, commentId, liked, likeCount } = action.payload || {};
        if (!postId || !commentId) return;

        const list = state.byPostId?.[postId] || [];
        const c = list.find((x) => x.id === commentId);
        if (c) {
          c.likedByCurrentUser = !!liked;
          c.likeCount = likeCount ?? c.likeCount ?? 0;
        }
      })
      .addCase(toggleCommentLike.rejected, (state, action) => {
        const postId = action.payload?.postId;
        if (postId) {
          state.errorByPostId[postId] =
            action.payload?.message || "Toggle like comment failed";
        }
      });
  },
});

export const { clearCommentsByPost, syncCommentLike } = commentsSlice.actions;
export default commentsSlice.reducer;

// ====== Selectors ======
export const selectCommentsByPostId = (state, postId) => state.comments.byPostId[postId] || [];
export const selectCommentsLoadingByPostId = (state, postId) => !!state.comments.loadingByPostId[postId];
export const selectCommentsErrorByPostId = (state, postId) => state.comments.errorByPostId[postId];
export const selectCommentSubmittingByPostId = (state, postId) => !!state.comments.submittingByPostId[postId];
export const selectCommentsPageByPostId = (state, postId) => state.comments.pageByPostId[postId] ?? 0;
export const selectCommentsHasMoreByPostId = (state, postId) => state.comments.hasMoreByPostId[postId] ?? true;
