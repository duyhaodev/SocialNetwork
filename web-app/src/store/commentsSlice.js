import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import commentApi from "@/api/commentApi";
import likeApi from "../api/likeApi";

export const fetchCommentsByPost = createAsyncThunk(
  "comments/fetchByPost",
  async ({ postId, page = 0, size = 10 }, { rejectWithValue }) => {
    try {
      const res = await commentApi.getComments(postId, page, size);
      // Đảm bảo lấy đúng mảng result từ cấu trúc { code: 1000, result: [...] }
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
  async ({ postId, content, mediaIds, parentId }, { rejectWithValue }) => {
    try {
      const res = await commentApi.createComment({
        postId,
        content,
        parentId: parentId || null,
        mediaIds: mediaIds || [] // Chuyển từ mediaUrls của FE thành mediaIds của BE
      });
      
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

const initialState = {
  byPostId: {},
  loadingByPostId: {},
  errorByPostId: {},
  submittingByPostId: {},
  pageByPostId: {},
  hasMoreByPostId: {},
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
        
        // Cập nhật dữ liệu vào đúng ID bài viết
        if (page === 0) {
          state.byPostId[postId] = data;
        } else {
          const prevList = state.byPostId[postId] || [];
          state.byPostId[postId] = [...prevList, ...data];
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
          const list = state.byPostId[postId] || [];
          state.byPostId[postId] = [data, ...list];
        }
      })
      .addCase(toggleCommentLike.fulfilled, (state, action) => {
        const { postId, commentId, liked, likeCount } = action.payload;
        const list = state.byPostId[postId];
        if (list) {
          const c = list.find(x => x.id === commentId);
          if (c) {
            c.likedByCurrentUser = !!liked;
            c.likeCount = likeCount;
          }
        }
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { postId, commentId } = action.payload;
        if (state.byPostId[postId]) {
          state.byPostId[postId] = state.byPostId[postId].filter(c => c.id !== commentId);
        }
      });
  },
});

export const { clearCommentsByPost } = commentsSlice.actions;
export default commentsSlice.reducer;

export const selectCommentsByPostId = (state, postId) => state.comments.byPostId[postId] || [];
export const selectCommentsLoadingByPostId = (state, postId) => !!state.comments.loadingByPostId[postId];
export const selectCommentsErrorByPostId = (state, postId) => state.comments.errorByPostId[postId];
export const selectCommentSubmittingByPostId = (state, postId) => !!state.comments.submittingByPostId[postId];
export const selectCommentsPageByPostId = (state, postId) => state.comments.pageByPostId[postId] ?? 0;
export const selectCommentsHasMoreByPostId = (state, postId) => state.comments.hasMoreByPostId[postId] ?? true;