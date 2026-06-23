import { createAsyncThunk, createSlice, createEntityAdapter } from "@reduxjs/toolkit";
import postApi from "../api/postApi";
import repostApi from "../api/repostApi";

// 1. ENTITY ADAPTER SETUP
const postsAdapter = createEntityAdapter({
  selectId: (post) => post.id || post.postId,
});

// 2. ASYNC THUNKS
export const fetchRecommendedFeed = createAsyncThunk(
  "posts/fetchRecommendedFeed",
  async ({ page = 0, size = 20 }, { rejectWithValue }) => {
    try {
      const res = await postApi.getRecommendedFeed({ page, size });
      const data = res?.result || [];
      return { page, size, data };
    } catch (err) {
      return rejectWithValue(err?.message || "Không thể tải bảng tin");
    }
  }
);

export const fetchTrendingTags = createAsyncThunk(
  "posts/fetchTrendingTags",
  async (limit = 3, { rejectWithValue }) => {
    try {
      const res = await postApi.getTrendingTags(limit);
      return res.result || [];
    } catch (err) {
      return rejectWithValue(err?.message || "Không thể tải xu hướng");
    }
  }
);

export const fetchPostsByTag = createAsyncThunk(
  "posts/fetchPostsByTag",
  async ({ tag, page = 0, size = 20 }, { rejectWithValue }) => {
    try {
      const res = await postApi.getPostsByTag(tag, { page, size });
      const data = res?.result || [];
      return { tag, page, size, data };
    } catch (err) {
      return rejectWithValue(err?.message || "Không thể tải bài viết");
    }
  }
);

export const createPost = createAsyncThunk(
  "posts/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await postApi.create(payload);
      return res.result;
    } catch (err) {
      return rejectWithValue({ message: err?.message || "Đăng bài thất bại" });
    }
  }
);

export const deletePost = createAsyncThunk(
  "posts/delete",
  async (postId, { rejectWithValue }) => {
    try {
      await postApi.deletePost(postId);
      return { postId };
    } catch (err) {
      return rejectWithValue(err?.message || "Xóa bài thất bại");
    }
  }
);

export const toggleRepost = createAsyncThunk(
  "posts/toggleRepost",
  async (postId, { rejectWithValue }) => {
    try {
      const res = await repostApi.toggle(postId);
      return res.result;
    } catch (err) {
      console.error("Lỗi khi gọi API Repost:", err);
      return rejectWithValue(err.response?.data?.message || "Thao tác thất bại");
    }
  }
);

export const fetchMyPosts = createAsyncThunk(
  "posts/fetchMyPosts",
  async (_, { rejectWithValue }) => {
    try {
      const res = await postApi.getMyPosts();
      return res.result || [];
    } catch (err) {
      return rejectWithValue(err?.message || "Không thể tải bài viết của bạn");
    }
  }
);

export const fetchUserPosts = createAsyncThunk(
  "posts/fetchUserPosts",
  async ({ username }, { rejectWithValue }) => {
    try {
      const res = await postApi.getUserPosts(username);
      const data = res.result || [];
      return { username, data };
    } catch (err) {
      return rejectWithValue(err?.message || "Không thể tải bài viết người dùng");
    }
  }
);

export const fetchMyReposts = createAsyncThunk(
  "posts/fetchMyReposts",
  async (_, { rejectWithValue }) => {
    try {
      const res = await postApi.getMyReposts();
      return res.result || [];
    } catch (err) {
      return rejectWithValue(err?.message || "Không thể tải bài chia sẻ");
    }
  }
);

export const fetchUserReposts = createAsyncThunk(
  "posts/fetchUserReposts",
  async ({ username }, { rejectWithValue }) => {
    try {
      const res = await postApi.getUserReposts(username);
      const data = res.result || [];
      return { username, data };
    } catch (err) {
      return rejectWithValue(err?.message || "Không thể tải bài chia sẻ");
    }
  }
);

export const fetchPostById = createAsyncThunk(
  "posts/fetchPostById",
  async (postId, { rejectWithValue }) => {
    try {
      const res = await postApi.getPostById(postId);
      return res.result;
    } catch (err) {
      return rejectWithValue(err?.message || "Không tìm thấy bài viết");
    }
  }
);

// 3. SLICE INITIAL STATE USING ADAPTER
const initialState = postsAdapter.getInitialState({
  feedIds: [],
  page: 0,
  size: 20,
  hasMore: true,
  loading: false,
  creating: false,
  reposting: false,
  unreposting: false,
  error: null,

  myPostsIds: [],
  loadingMyPosts: false,
  myPostsError: null,

  userPostsIds: [],
  loadingUserPosts: false,
  userPostsError: null,

  myRepostsIds: [],
  loadingMyReposts: false,
  myRepostsError: null,

  userRepostsIds: [],
  loadingUserReposts: false,
  userRepostsError: null,

  postDetailId: null,
  loadingPostDetail: false,
  postDetailError: null,

  searchPostsIds: [],
  loadingSearchPosts: false,
  searchPostsError: null,

  trendingTags: [],
  loadingTrending: false,

  tagPostsIds: [],
  loadingTagPosts: false,
  tagPage: 0,
  tagHasMore: true,
});

// 4. SLICE
const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    resetFeed(state) {
      state.feedIds = [];
      state.page = 0;
      state.hasMore = true;
      state.error = null;
    },
    resetTagFeed(state) {
      state.tagPostsIds = [];
      state.tagPage = 0;
      state.tagHasMore = true;
    },
    syncLikeByOriginalId(state, action) {
      const { originalId, liked, likeCount } = action.payload || {};
      if (!originalId) return;

      // Update the original post in entities
      if (state.entities[originalId]) {
        state.entities[originalId].likeCount = likeCount;
        state.entities[originalId].likedByCurrentUser = liked;
      }

      // Also update any reposts referencing this post in entities
      Object.values(state.entities).forEach((p) => {
        if (p && p.repostOfId === originalId) {
          p.likeCount = likeCount;
          p.likedByCurrentUser = liked;
        }
      });
    },
    setSearchPosts(state, action) {
      const posts = action.payload || [];
      postsAdapter.upsertMany(state, posts);
      state.searchPostsIds = posts.map((p) => p.id || p.postId);
      state.searchPostsError = null;
    },
    syncCommentCount(state, action) {
      const { postId, delta } = action.payload || {};
      if (!postId) return;

      if (state.entities[postId]) {
        state.entities[postId].commentCount = Math.max(0, (state.entities[postId].commentCount ?? 0) + delta);
      }

      // Sync reposts comment count
      Object.values(state.entities).forEach((p) => {
        if (p && p.repostOfId === postId) {
          p.commentCount = Math.max(0, (p.commentCount ?? 0) + delta);
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchRecommendedFeed
      .addCase(fetchRecommendedFeed.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecommendedFeed.fulfilled, (state, action) => {
        const { page, size, data } = action.payload;
        postsAdapter.upsertMany(state, data);

        const ids = data.map((p) => p.id || p.postId);
        if (page === 0) {
          state.feedIds = ids;
        } else {
          state.feedIds = [...state.feedIds, ...ids];
        }
        state.page = page + 1;
        state.loading = false;
        state.hasMore = data.length === size;
      })
      .addCase(fetchRecommendedFeed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.hasMore = false;
      })

      // createPost
      .addCase(createPost.pending, (state) => {
        state.creating = true;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        const post = action.payload;
        postsAdapter.upsertOne(state, post);
        state.feedIds = [post.id || post.postId, ...state.feedIds];
        state.creating = false;
        state.lastMutatedAt = Date.now();
      })
      .addCase(createPost.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload?.message;
      })

      // deletePost
      .addCase(deletePost.fulfilled, (state, action) => {
        const { postId } = action.payload;

        // Find reposts to delete
        const repostIdsToRemove = Object.values(state.entities)
          .filter((p) => p && p.repostOfId === postId)
          .map((p) => p.id || p.postId);

        postsAdapter.removeOne(state, postId);
        postsAdapter.removeMany(state, repostIdsToRemove);

        const filterFn = (id) => id !== postId && !repostIdsToRemove.includes(id);

        state.feedIds = state.feedIds.filter(filterFn);
        state.myPostsIds = state.myPostsIds.filter(filterFn);
        state.userPostsIds = state.userPostsIds.filter(filterFn);
        state.myRepostsIds = state.myRepostsIds.filter(filterFn);
        state.userRepostsIds = state.userRepostsIds.filter(filterFn);
        state.searchPostsIds = state.searchPostsIds.filter(filterFn);
        state.tagPostsIds = state.tagPostsIds.filter(filterFn);

        if (state.postDetailId === postId || repostIdsToRemove.includes(state.postDetailId)) {
          state.postDetailId = null;
        }
        state.lastMutatedAt = Date.now();
      })

      // toggleRepost
      .addCase(toggleRepost.pending, (state) => {
        state.reposting = true;
      })
      .addCase(toggleRepost.fulfilled, (state, action) => {
        state.reposting = false;
        const result = action.payload;
        const originalPostId = action.meta.arg;

        const updatePost = (p) => {
          if (!p) return;
          const isTarget = p.id === originalPostId ||
            p.repostOfId === originalPostId ||
            (p.repostOfId && p.repostOfId === result.post?.repostOfId);

          if (isTarget) {
            p.repostedByCurrentUser = result.reposted;
            p.repostCount = result.repostCount;
          }
        };
        Object.values(state.entities).forEach(updatePost);

        if (result.reposted && result.post) {
          postsAdapter.upsertOne(state, result.post);
          const newId = result.post.id || result.post.postId;
          state.feedIds = [newId, ...state.feedIds];
          state.myRepostsIds = [newId, ...state.myRepostsIds];
        } else if (!result.reposted && result.deletedRepostId) {
          const filterId = result.deletedRepostId;
          postsAdapter.removeOne(state, filterId);

          const filterFn = (id) => id !== filterId;
          state.feedIds = state.feedIds.filter(filterFn);
          state.myPostsIds = state.myPostsIds.filter(filterFn);
          state.userPostsIds = state.userPostsIds.filter(filterFn);
          state.myRepostsIds = state.myRepostsIds.filter(filterFn);
          state.userRepostsIds = state.userRepostsIds.filter(filterFn);
          state.searchPostsIds = state.searchPostsIds.filter(filterFn);
          state.tagPostsIds = state.tagPostsIds.filter(filterFn);
        }
      })
      .addCase(toggleRepost.rejected, (state, action) => {
        state.reposting = false;
        state.error = action.payload;
      })

      // fetchMyPosts
      .addCase(fetchMyPosts.pending, (state) => { state.loadingMyPosts = true; })
      .addCase(fetchMyPosts.fulfilled, (state, action) => {
        state.loadingMyPosts = false;
        postsAdapter.upsertMany(state, action.payload);
        state.myPostsIds = action.payload.map((p) => p.id || p.postId);
      })
      .addCase(fetchMyPosts.rejected, (state, action) => {
        state.loadingMyPosts = false;
        state.myPostsError = action.payload;
      })

      // fetchUserPosts
      .addCase(fetchUserPosts.fulfilled, (state, action) => {
        state.loadingUserPosts = false;
        postsAdapter.upsertMany(state, action.payload.data);
        state.userPostsIds = action.payload.data.map((p) => p.id || p.postId);
      })

      // fetchMyReposts
      .addCase(fetchMyReposts.pending, (state) => { state.loadingMyReposts = true; })
      .addCase(fetchMyReposts.fulfilled, (state, action) => {
        state.loadingMyReposts = false;
        postsAdapter.upsertMany(state, action.payload);
        state.myRepostsIds = action.payload.map((p) => p.id || p.postId);
      })

      // fetchUserReposts
      .addCase(fetchUserReposts.pending, (state) => { state.loadingUserReposts = true; })
      .addCase(fetchUserReposts.fulfilled, (state, action) => {
        state.loadingUserReposts = false;
        postsAdapter.upsertMany(state, action.payload.data);
        state.userRepostsIds = action.payload.data.map((p) => p.id || p.postId);
      })

      // fetchPostById
      .addCase(fetchPostById.pending, (state) => {
        state.loadingPostDetail = true;
        state.postDetailId = null;
        state.postDetailError = null;
      })
      .addCase(fetchPostById.fulfilled, (state, action) => {
        state.loadingPostDetail = false;
        postsAdapter.upsertOne(state, action.payload);
        state.postDetailId = action.payload.id || action.payload.postId;
      })
      .addCase(fetchPostById.rejected, (state, action) => {
        state.loadingPostDetail = false;
        state.postDetailError = action.payload || action.error?.message;
      })

      // fetchTrendingTags
      .addCase(fetchTrendingTags.pending, (state) => {
        state.loadingTrending = true;
      })
      .addCase(fetchTrendingTags.fulfilled, (state, action) => {
        state.loadingTrending = false;
        state.trendingTags = action.payload;
      })
      .addCase(fetchTrendingTags.rejected, (state) => {
        state.loadingTrending = false;
      })

      // fetchPostsByTag
      .addCase(fetchPostsByTag.pending, (state) => {
        state.loadingTagPosts = true;
      })
      .addCase(fetchPostsByTag.fulfilled, (state, action) => {
        const { page, size, data } = action.payload;
        postsAdapter.upsertMany(state, data);

        const ids = data.map((p) => p.id || p.postId);
        if (page === 0) {
          state.tagPostsIds = ids;
        } else {
          state.tagPostsIds = [...state.tagPostsIds, ...ids];
        }
        state.tagPage = page + 1;
        state.loadingTagPosts = false;
        state.tagHasMore = data.length === size;
      })
      .addCase(fetchPostsByTag.rejected, (state) => {
        state.loadingTagPosts = false;
      });
  },
});

export const { resetFeed, resetTagFeed, syncLikeByOriginalId, setSearchPosts, syncCommentCount } = postsSlice.actions;
export default postsSlice.reducer;

// 5. SELECTORS
export const selectPosts = (state) => state.posts.feedIds.map(id => state.posts.entities[id]).filter(Boolean);
export const selectPostsLoading = (state) => state.posts.loading;
export const selectPostsCreating = (state) => state.posts.creating;
export const selectPostsHasMore = (state) => state.posts.hasMore;
export const selectPostsPage = (state) => state.posts.page;
export const selectPostsError = (state) => state.posts.error;
export const selectLastMutatedAt = (state) => state.posts.lastMutatedAt;

export const selectTrendingTags = (state) => state.posts.trendingTags;
export const selectTrendingLoading = (state) => state.posts.loadingTrending;

export const selectTagPosts = (state) => state.posts.tagPostsIds.map(id => state.posts.entities[id]).filter(Boolean);
export const selectTagPostsLoading = (state) => state.posts.loadingTagPosts;
export const selectTagHasMore = (state) => state.posts.tagHasMore;
export const selectTagPage = (state) => state.posts.tagPage;

export const selectMyPosts = (state) => state.posts.myPostsIds.map(id => state.posts.entities[id]).filter(Boolean);
export const selectMyPostsLoading = (state) => state.posts.loadingMyPosts;
export const selectMyPostsError = (state) => state.posts.myPostsError;

export const selectUserPosts = (state) => state.posts.userPostsIds.map(id => state.posts.entities[id]).filter(Boolean);
export const selectUserPostsLoading = (state) => state.posts.loadingUserPosts;
export const selectUserPostsError = (state) => state.posts.userPostsError;

export const selectMyReposts = (state) => state.posts.myRepostsIds.map(id => state.posts.entities[id]).filter(Boolean);
export const selectMyRepostsLoading = (state) => state.posts.loadingMyReposts;
export const selectMyRepostsError = (state) => state.posts.myRepostsError;

export const selectUserReposts = (state) => state.posts.userRepostsIds.map(id => state.posts.entities[id]).filter(Boolean);
export const selectUserRepostsLoading = (state) => state.posts.loadingUserReposts;
export const selectUserRepostsError = (state) => state.posts.userRepostsError;

export const selectPostDetail = (state) => state.posts.entities[state.posts.postDetailId] || null;
export const selectPostDetailLoading = (state) => state.posts.loadingPostDetail;
export const selectPostDetailError = (state) => state.posts.postDetailError;

export const selectSearchPosts = (state) => state.posts.searchPostsIds.map(id => state.posts.entities[id]).filter(Boolean);
export const selectSearchPostsLoading = (state) => state.posts.loadingSearchPosts;
export const selectSearchPostsError = (state) => state.posts.searchPostsError;

export const selectIsReposting = (state) => state.posts.reposting;
export const selectIsUnreposting = (state) => state.posts.unreposting;