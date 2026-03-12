import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import postApi from "../api/postApi";

// Load feed
export const fetchFeed = createAsyncThunk(
  "posts/fetchFeed",
  async ({ page = 0, size = 20 }, { rejectWithValue }) => {
    try {
      const res = await postApi.getFeed({ page, size }); // res: PostResponse[] (axiosClient trả response.data)
      const data = Array.isArray(res) ? res : [];
      return { page, size, data };
    } catch (err) {
      return rejectWithValue(err?.message || "Load feed failed");
    }
  }
);

// Tạo bài viết
export const createPost = createAsyncThunk(
  "posts/create",
  async (formData, { rejectWithValue }) => {
    try {
      const res = await postApi.create(formData);
      // axiosClient đã trả về response.data => res chính là PostResponse
      return res; // (KHÔNG .data nữa)
    } catch (err) {
      // interceptor đã ném new Error(message) => lấy err.message
      return rejectWithValue({ message: err?.message || "Create post failed" });
    }
  }
);

// Xóa bài viết
export const deletePost = createAsyncThunk(
  "posts/delete",
  async (postId, { rejectWithValue }) => {
    try {
      await postApi.deletePost(postId);
      return { postId };
    } catch (err) {
      return rejectWithValue(err?.message || "Delete post failed");
    }
  }
);

// Repost bài viết
export const repostPost = createAsyncThunk(
  "posts/repost",
  async (postId, { rejectWithValue }) => {
    try {
      const res = await postApi.repost(postId);
      return res; // PostResponse (bài repost mới)
    } catch (err) {
      return rejectWithValue(err?.message || "Repost failed");
    }
  }
);

// Unrepost bài viết
export const unrepostPost = createAsyncThunk(
  "posts/unrepost",
  async (postId, { rejectWithValue }) => {
    try {
      const res = await postApi.unrepost(postId);
      return { originalId: postId, repostId: res?.repostId };
    } catch (err) {
      return rejectWithValue(err?.message || "Remove repost failed");
    }
  }
);

// Lấy bài viết của user đăng nhập
export const fetchMyPosts = createAsyncThunk(
  "posts/fetchMyPosts",
  async (_, { rejectWithValue }) => {
    try {
      const res = await postApi.getMyPosts();
      return res; // res = List<PostResponse>
    } catch (err) {
      return rejectWithValue(err?.message || "Load my posts failed");
    }
  }
);

// Lấy bài viết theo username (profile người khác)
export const fetchUserPosts = createAsyncThunk(
  "posts/fetchUserPosts",
  async ({ username }, { rejectWithValue }) => {
    try {
      const res = await postApi.getUserPosts(username);
      const data = Array.isArray(res) ? res : [];
      return { username, data };
    } catch (err) {
      return rejectWithValue(err?.message || "Load user posts failed");
    }
  }
);

// Lấy danh sách reposts của mình
export const fetchMyReposts = createAsyncThunk(
  "posts/fetchMyReposts",
  async (_, { rejectWithValue }) => {
    try {
      const res = await postApi.getMyReposts();
      const data = Array.isArray(res) ? res : [];
      return data;
    } catch (err) {
      return rejectWithValue(err?.message || "Load my reposts failed");
    }
  }
);

// Lấy danh sách reposts của user khác
export const fetchUserReposts = createAsyncThunk(
  "posts/fetchUserReposts",
  async ({ username }, { rejectWithValue }) => {
    try {
      const res = await postApi.getUserReposts(username);
      const data = Array.isArray(res) ? res : [];
      return { username, data };
    } catch (err) {
      return rejectWithValue(err?.message || "Load user reposts failed");
    }
  }
);

// Lấy chi tiết bài viết theo ID
export const fetchPostById = createAsyncThunk(
  "posts/fetchPostById",
  async (postId, { rejectWithValue }) => {
    try {
      const res = await postApi.getPostById(postId);
      return res; // PostResponse
    } catch (err) {
      return rejectWithValue(err?.message || "Load post detail failed");
    }
  }
);



const postsSlice = createSlice({
  name: "posts",
  initialState: {
    items: [],
    page: 0,
    size: 20,
    hasMore: true,
    loading: false,
    creating: false,
    error: null,

    myPosts: [],
    loadingMyPosts: false,
    myPostsError: null,

    userPosts: [],
    loadingUserPosts: false,
    userPostsError: null,

    myReposts: [],
    loadingMyReposts: false,
    myRepostsError: null,

    userReposts: [],
    loadingUserReposts: false,
    userRepostsError: null,

    postDetail: null,
    loadingPostDetail: false,
    postDetailError: null,

    searchPosts: [],
    loadingSearchPosts: false,
    searchPostsError: null,
  },
  reducers: {
    resetFeed(state) {
      state.items = [];
      state.page = 0;
      state.hasMore = true;
      state.error = null;
    },
    syncLikeByOriginalId(state, action) {
      const { originalId, liked, likeCount } = action.payload || {};
      if (!originalId) return;

      const apply = (p) => {
        const pOriginalId = p?.repostOfId ?? p?.id;
        if (pOriginalId === originalId) {
          p.likeCount = likeCount;
          if (typeof p.likedByCurrentUser === "boolean") {
            p.likedByCurrentUser = liked;
          } else if (typeof p.isLikedByCurrentUser === "boolean") {
            p.isLikedByCurrentUser = liked;
          } else if (typeof p.liked === "boolean") {
            p.liked = liked;
          } else {
            p.likedByCurrentUser = liked;
          }
        }
      };
      state.items.forEach(apply);
      state.myPosts.forEach(apply);
      state.userPosts.forEach(apply);
      state.myReposts.forEach(apply);
      state.userReposts.forEach(apply);
      state.searchPosts.forEach(apply);
      if (state.postDetail) apply(state.postDetail);
    },

    setSearchPosts(state, action) {
      state.searchPosts = action.payload || [];
      state.searchPostsError = null;
    },

  },
  extraReducers: (builder) => {
    builder
      // fetchFeed
      .addCase(fetchFeed.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        const { page, size, data } = action.payload;
        const sorted = data.slice().sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        if (page === 0) {
          state.items = sorted;
        } else {
          state.items = [...state.items, ...sorted];
        }
        state.page = page + 1;
        state.loading = false;

        // Nếu số lượng bài trả về ít hơn size yêu cầu, tức là đã hết bài
        if (data.length < size) {
          state.hasMore = false;
        } else {
          state.hasMore = true;
        }
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Load feed failed";
      })

      // createPost
      .addCase(createPost.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.items = [action.payload, ...state.items]; // bài mới lên đầu
        state.creating = false;
      })
      .addCase(createPost.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload?.message || "Create post failed";
      })
      // deletePost
      .addCase(deletePost.fulfilled, (state, action) => {
        const { postId } = action.payload;

        const shouldRemove = (p) => p?.id === postId || p?.repostOfId === postId;

        state.items = state.items.filter((p) => !shouldRemove(p));
        state.myPosts = state.myPosts.filter((p) => !shouldRemove(p));
        state.userPosts = state.userPosts.filter((p) => !shouldRemove(p));
        state.myReposts = state.myReposts.filter((p) => !shouldRemove(p));
        state.userReposts = state.userReposts.filter((p) => !shouldRemove(p));
        state.searchPosts = state.searchPosts.filter((p) => !shouldRemove(p));

        if (state.postDetail) {
          const detailOriginalId = state.postDetail.repostOfId ?? state.postDetail.id;
          if (state.postDetail.id === postId || detailOriginalId === postId) {
            state.postDetail = null;
          }
        }
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.error = action.payload || "Delete post failed";
      })


      // repostPost 
      .addCase(repostPost.pending, (state) => {
        state.reposting = true;
        state.error = null;
      })
      .addCase(repostPost.fulfilled, (state, action) => {
        state.reposting = false;
        const newPost = action.payload;
        state.items = [newPost, ...state.items];
        const originalId = newPost.repostOfId;
        if (!originalId) return;

        const bumpIfSameOriginal = (p) => {
          if (p.id === newPost.id) return; 
          const pOriginalId = p.repostOfId ?? p.id;
          if (pOriginalId === originalId) {
            p.repostCount = (p.repostCount ?? 0) + 1;
            if (typeof p.repostedByCurrentUser === "boolean") {
              p.repostedByCurrentUser = true;
            }
          }
        };

        state.items.forEach(bumpIfSameOriginal);
        if (state.postDetail) bumpIfSameOriginal(state.postDetail);
        state.myPosts.forEach(bumpIfSameOriginal);
        state.userPosts.forEach(bumpIfSameOriginal);
        state.myReposts.forEach(bumpIfSameOriginal);
        state.userReposts.forEach(bumpIfSameOriginal);
        state.searchPosts.forEach(bumpIfSameOriginal);

      })
      .addCase(repostPost.rejected, (state, action) => {
        state.reposting = false;
        state.error = action.payload || "Repost failed";
      })

      // unrepostPost
      .addCase(unrepostPost.pending, (state) => {
        state.unreposting = true;
        state.error = null;
      })
      .addCase(unrepostPost.fulfilled, (state, action) => {
        state.unreposting = false;
        const { originalId, repostId } = action.payload || {};
        if (!originalId) return;

        const decIfSameOriginal = (p) => {
          const pOriginalId = p.repostOfId ?? p.id;
          if (pOriginalId === originalId) {
            p.repostCount = Math.max(0, (p.repostCount ?? 0) - 1);
            if (typeof p.repostedByCurrentUser === "boolean") {
              p.repostedByCurrentUser = false;
            }
          }
        };

        state.items.forEach(decIfSameOriginal);
        if (state.postDetail) decIfSameOriginal(state.postDetail);
        state.myPosts.forEach(decIfSameOriginal);
        state.userPosts.forEach(decIfSameOriginal);
        state.myReposts.forEach(decIfSameOriginal);
        state.userReposts.forEach(decIfSameOriginal);
        state.searchPosts.forEach(decIfSameOriginal);

        if (repostId) {
          state.items = state.items.filter((p) => p.id !== repostId);
          state.myReposts = state.myReposts.filter((p) => p.id !== repostId);
          state.userReposts = state.userReposts.filter((p) => p.id !== repostId);
          state.searchPosts = state.searchPosts.filter((p) => p.id !== repostId);
        }
      })
      .addCase(unrepostPost.rejected, (state, action) => {
        state.unreposting = false;
        state.error = action.payload || "Remove repost failed";
      })


      // fetchMyPosts
      .addCase(fetchMyPosts.pending, (state) => {
        state.loadingMyPosts = true;
        state.myPostsError = null;
      })
      .addCase(fetchMyPosts.fulfilled, (state, action) => {
        state.loadingMyPosts = false;
        state.myPosts = action.payload || [];
      })
      .addCase(fetchMyPosts.rejected, (state, action) => {
        state.loadingMyPosts = false;
        state.myPostsError = action.payload || "Load my posts failed";
      })

      // fetchUserPosts
      .addCase(fetchUserPosts.pending, (state) => {
        state.loadingUserPosts = true;
        state.userPostsError = null;
      })
      .addCase(fetchUserPosts.fulfilled, (state, action) => {
        state.loadingUserPosts = false;
        const { data } = action.payload;
        // có thể sort theo createdAt nếu muốn giống feed
        const sorted = data.slice().sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        state.userPosts = sorted;
      })
      .addCase(fetchUserPosts.rejected, (state, action) => {
        state.loadingUserPosts = false;
        state.userPostsError = action.payload || "Load user posts failed";
      })

      // ===== fetchMyReposts =====
      .addCase(fetchMyReposts.pending, (state) => {
        state.loadingMyReposts = true;
        state.myRepostsError = null;
      })
      .addCase(fetchMyReposts.fulfilled, (state, action) => {
        state.loadingMyReposts = false;
        const data = action.payload || [];
        const sorted = data
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        state.myReposts = sorted;
      })
      .addCase(fetchMyReposts.rejected, (state, action) => {
        state.loadingMyReposts = false;
        state.myRepostsError = action.payload || "Load my reposts failed";
      })

      // ===== fetchUserReposts =====
      .addCase(fetchUserReposts.pending, (state) => {
        state.loadingUserReposts = true;
        state.userRepostsError = null;
      })
      .addCase(fetchUserReposts.fulfilled, (state, action) => {
        state.loadingUserReposts = false;
        const { data } = action.payload;
        const sorted = data
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        state.userReposts = sorted;
      })
      .addCase(fetchUserReposts.rejected, (state, action) => {
        state.loadingUserReposts = false;
        state.userRepostsError = action.payload || "Load user reposts failed";
      })

      // fetchPostById
      .addCase(fetchPostById.pending, (state) => {
        state.loadingPostDetail = true;
        state.postDetailError = null;
      })
      .addCase(fetchPostById.fulfilled, (state, action) => {
        state.loadingPostDetail = false;
        state.postDetail = action.payload || null;
      })
      .addCase(fetchPostById.rejected, (state, action) => {
        state.loadingPostDetail = false;
        state.postDetail = null;
        state.postDetailError = action.payload || "Load post detail failed";
      });
  },
});

export const { resetFeed, syncLikeByOriginalId, setSearchPosts } = postsSlice.actions;
export default postsSlice.reducer;

// Selectors
export const selectPosts = (state) => state.posts.items;
export const selectPostsLoading = (state) => state.posts.loading;
export const selectPostsCreating = (state) => state.posts.creating;
export const selectPostsHasMore = (state) => state.posts.hasMore;
export const selectPostsPage = (state) => state.posts.page;
export const selectPostsError = (state) => state.posts.error;

export const selectMyPosts = (state) => state.posts.myPosts;
export const selectMyPostsLoading = (state) => state.posts.loadingMyPosts;
export const selectMyPostsError = (state) => state.posts.myPostsError;

export const selectUserPosts = (state) => state.posts.userPosts;
export const selectUserPostsLoading = (state) => state.posts.loadingUserPosts;
export const selectUserPostsError = (state) => state.posts.userPostsError;

export const selectMyReposts = (state) => state.posts.myReposts;
export const selectMyRepostsLoading = (state) => state.posts.loadingMyReposts;
export const selectMyRepostsError = (state) => state.posts.myRepostsError;

export const selectUserReposts = (state) => state.posts.userReposts;
export const selectUserRepostsLoading = (state) => state.posts.loadingUserReposts;
export const selectUserRepostsError = (state) => state.posts.userRepostsError;

export const selectPostDetail = (state) => state.posts.postDetail;
export const selectPostDetailLoading = (state) => state.posts.loadingPostDetail;
export const selectPostDetailError = (state) => state.posts.postDetailError;

export const selectSearchPosts = (state) => state.posts.searchPosts;
export const selectSearchPostsLoading = (state) => state.posts.loadingSearchPosts;
export const selectSearchPostsError = (state) => state.posts.searchPostsError;

