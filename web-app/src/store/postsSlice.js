import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import postApi from "../api/postApi";
import repostApi from "../api/repostApi";

// ==========================================
// 1. ASYNC THUNKS (API CALLS)
// ==========================================

// Load bảng tin chính (Feed)
export const fetchFeed = createAsyncThunk(
  "posts/fetchFeed",
  async ({ page = 0, size = 20 }, { rejectWithValue }) => {
    try {
      const res = await postApi.getFeed({ page, size });
      // Lấy result từ ApiResponse { code, result, message }
      const data = res?.result || [];
      return { page, size, data };
    } catch (err) {
      return rejectWithValue(err?.message || "Không thể tải bảng tin");
    }
  }
);

// Tạo bài viết mới (Payload: { content, mediaIds, repostOfId })
export const createPost = createAsyncThunk(
  "posts/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await postApi.create(payload);
      return res.result; // Trả về PostResponse
    } catch (err) {
      return rejectWithValue({ message: err?.message || "Đăng bài thất bại" });
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
      return rejectWithValue(err?.message || "Xóa bài thất bại");
    }
  }
);

// Repost bài viết
export const toggleRepost = createAsyncThunk(
  "posts/toggleRepost",
  async (postId, { rejectWithValue }) => {
    try {
      // Đổi postApi.repost thành repostApi.toggle
      const res = await repostApi.toggle(postId); 
      return res.result; 
    } catch (err) {
      // Log lỗi ra đây để Hào nhìn thấy ở tab Console
      console.error("Lỗi khi gọi API Repost:", err);
      return rejectWithValue(err.response?.data?.message || "Thao tác thất bại");
    }
  }
);

// Lấy bài viết của chính mình (Profile)
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

// Lấy bài viết của user khác
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

// Lấy danh sách reposts của mình
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

// Lấy danh sách reposts của user khác
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

// Lấy chi tiết 1 bài viết
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

// ==========================================
// 2. SLICE CONFIGURATION
// ==========================================

const postsSlice = createSlice({
  name: "posts",
  initialState: {
    items: [],
    page: 0,
    size: 20,
    hasMore: true,
    loading: false,
    creating: false,
    reposting: false,
    unreposting: false,
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
    // Đồng bộ trạng thái Like xuyên suốt các màn hình
    syncLikeByOriginalId(state, action) {
      const { originalId, liked, likeCount } = action.payload || {};
      if (!originalId) return;

      const apply = (p) => {
        // Kiểm tra xem bài hiện tại có phải là bài gốc hoặc là bài repost của bài gốc không
        const pOriginalId = p?.repostOfId || p?.id;
        if (pOriginalId === originalId) {
          p.likeCount = likeCount;
          p.likedByCurrentUser = liked;
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
        if (page === 0) {
          state.items = data;
        } else {
          state.items = [...state.items, ...data];
        }
        state.page = page + 1;
        state.loading = false;
        state.hasMore = data.length === size;
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // createPost
      .addCase(createPost.pending, (state) => {
        state.creating = true;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.items = [action.payload, ...state.items];
        state.creating = false;
      })
      .addCase(createPost.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload?.message;
      })

      // deletePost
      .addCase(deletePost.fulfilled, (state, action) => {
        const { postId } = action.payload;
        const filterFn = (p) => p.id !== postId && p.repostOfId !== postId;
        
        state.items = state.items.filter(filterFn);
        state.myPosts = state.myPosts.filter(filterFn);
        state.userPosts = state.userPosts.filter(filterFn);
        state.myReposts = state.myReposts.filter(filterFn);
        state.userReposts = state.userReposts.filter(filterFn);
        
        if (state.postDetail?.id === postId || state.postDetail?.repostOfId === postId) {
          state.postDetail = null;
        }
      })

      // repostPost
      .addCase(toggleRepost.pending, (state) => { 
        state.reposting = true; 
      })
      .addCase(toggleRepost.fulfilled, (state, action) => {
          state.reposting = false;
          const result = action.payload; 
          const originalPostId = action.meta.arg; // ID của bài mà User nhấn nút

          // 1. Hàm cập nhật số lượng & trạng thái (Dùng cho Like/Repost đồng bộ)
          const updateGlobalStats = (p) => {
              // Logic: Nếu ID bài này là bài gốc, HOẶC nó là bài vỏ trỏ về bài gốc đó
              const isTarget = p.id === originalPostId || 
                               p.repostOfId === originalPostId ||
                               (p.repostOfId && p.repostOfId === (action.payload.post?.repostOfId));
              
              if (isTarget) {
                  p.repostedByCurrentUser = result.reposted;
                  p.repostCount = result.repostCount;
              }
          };

          // 2. Quét sạch tất cả các mảng để đồng bộ số lượng
          [state.items, state.myPosts, state.userPosts, state.myReposts, state.userReposts, state.searchPosts]
            .forEach(list => list.forEach(updateGlobalStats));
            
          if (state.postDetail) updateGlobalStats(state.postDetail);

          // 3. Xử lý Thêm/Xóa bài viết hiển thị (UI logic)
          if (result.reposted && result.post) {
              // Thêm bài mới vào đầu Feed và đầu danh sách Repost của tôi
              state.items.unshift(result.post);
              state.myReposts.unshift(result.post);
          } else if (!result.reposted && result.deletedRepostId) {
              // Hủy Repost: Xóa bài vỏ khỏi TẤT CẢ các danh sách hiển thị
              const filterId = result.deletedRepostId;
              const filterFn = (p) => p.id !== filterId;

              state.items = state.items.filter(filterFn);
              state.myPosts = state.myPosts.filter(filterFn);
              state.userPosts = state.userPosts.filter(filterFn);
              state.myReposts = state.myReposts.filter(filterFn);
              state.userReposts = state.userReposts.filter(filterFn);
              state.searchPosts = state.searchPosts.filter(filterFn);
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
        state.myPosts = action.payload;
      })

      // fetchUserPosts
      .addCase(fetchUserPosts.fulfilled, (state, action) => {
        state.loadingUserPosts = false;
        state.userPosts = action.payload.data;
      })

      // fetchMyReposts
      .addCase(fetchMyReposts.pending, (state) => { state.loadingMyReposts = true; })
      .addCase(fetchMyReposts.fulfilled, (state, action) => {
        state.loadingMyReposts = false;
        state.myReposts = action.payload;
      })

      // fetchUserReposts
      .addCase(fetchUserReposts.pending, (state) => { state.loadingUserReposts = true; })
      .addCase(fetchUserReposts.fulfilled, (state, action) => {
        state.loadingUserReposts = false;
        state.userReposts = action.payload.data;
      })

      // fetchPostById
      .addCase(fetchPostById.fulfilled, (state, action) => {
        state.loadingPostDetail = false;
        state.postDetail = action.payload;
      });
  },
});

export const { resetFeed, syncLikeByOriginalId, setSearchPosts } = postsSlice.actions;
export default postsSlice.reducer;

// ==========================================
// 3. SELECTORS (Sử dụng với useSelector)
// ==========================================

// Bảng tin chính (Feed)
export const selectPosts = (state) => state.posts.items;
export const selectPostsLoading = (state) => state.posts.loading;
export const selectPostsCreating = (state) => state.posts.creating;
export const selectPostsHasMore = (state) => state.posts.hasMore;
export const selectPostsPage = (state) => state.posts.page;
export const selectPostsError = (state) => state.posts.error;

// Bài viết của tôi (My Profile)
export const selectMyPosts = (state) => state.posts.myPosts;
export const selectMyPostsLoading = (state) => state.posts.loadingMyPosts;
export const selectMyPostsError = (state) => state.posts.myPostsError;

// Bài viết của người dùng khác (User Profile)
export const selectUserPosts = (state) => state.posts.userPosts;
export const selectUserPostsLoading = (state) => state.posts.loadingUserPosts;
export const selectUserPostsError = (state) => state.posts.userPostsError;

// Danh sách bài Repost của tôi
export const selectMyReposts = (state) => state.posts.myReposts;
export const selectMyRepostsLoading = (state) => state.posts.loadingMyReposts;
export const selectMyRepostsError = (state) => state.posts.myRepostsError;

// Danh sách bài Repost của người khác
export const selectUserReposts = (state) => state.posts.userReposts;
export const selectUserRepostsLoading = (state) => state.posts.loadingUserReposts;
export const selectUserRepostsError = (state) => state.posts.userRepostsError;

// Chi tiết bài viết
export const selectPostDetail = (state) => state.posts.postDetail;
export const selectPostDetailLoading = (state) => state.posts.loadingPostDetail;
export const selectPostDetailError = (state) => state.posts.postDetailError;

// Tìm kiếm bài viết
export const selectSearchPosts = (state) => state.posts.searchPosts;
export const selectSearchPostsLoading = (state) => state.posts.loadingSearchPosts;
export const selectSearchPostsError = (state) => state.posts.searchPostsError;

// Trạng thái Repost/Unrepost
export const selectIsReposting = (state) => state.posts.reposting;
export const selectIsUnreposting = (state) => state.posts.unreposting;