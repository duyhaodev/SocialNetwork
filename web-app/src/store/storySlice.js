import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import storyApi from "../api/storyApi";

// Lấy stories của những người mình follow (hiển thị ở đầu feed)
export const fetchFeedStories = createAsyncThunk(
    "stories/fetchFeed",
    async (_, { rejectWithValue }) => {
        try {
            const res = await storyApi.getFeedStories();
            return res?.result || [];
        } catch (err) {
            return rejectWithValue(err?.message || "Không thể tải stories");
        }
    }
);

// Lấy stories của mình
export const fetchMyStories = createAsyncThunk(
    "stories/fetchMine",
    async (_, { rejectWithValue }) => {
        try {
            const res = await storyApi.getMyStories();
            return res?.result || [];
        } catch (err) {
            return rejectWithValue(err?.message || "Không thể tải stories của bạn");
        }
    }
);

// Lấy kho lưu trữ
export const fetchArchive = createAsyncThunk(
    "stories/fetchArchive",
    async (_, { rejectWithValue }) => {
        try {
            const res = await storyApi.getArchive();
            return res?.result || [];
        } catch (err) {
            return rejectWithValue(err?.message || "Không thể tải kho lưu trữ");
        }
    }
);

// Tạo story mới
export const createStory = createAsyncThunk(
    "stories/create",
    async (request, { rejectWithValue }) => {
        try {
            const res = await storyApi.createStory(request);
            return res?.result;
        } catch (err) {
            return rejectWithValue(err?.message || "Đăng story thất bại");
        }
    }
);

// Xóa story
export const deleteStory = createAsyncThunk(
    "stories/delete",
    async (storyId, { rejectWithValue }) => {
        try {
            await storyApi.deleteStory(storyId);
            return { storyId };
        } catch (err) {
            return rejectWithValue(err?.message || "Xóa story thất bại");
        }
    }
);

// Đánh dấu đã xem
export const markStoryViewed = createAsyncThunk(
    "stories/markViewed",
    async (storyId, { rejectWithValue }) => {
        try {
            await storyApi.markViewed(storyId);
            return { storyId };
        } catch (err) {
            return rejectWithValue(err?.message);
        }
    }
);

// Tìm nhạc Spotify
export const searchMusic = createAsyncThunk(
    "stories/searchMusic",
    async (query, { rejectWithValue }) => {
        try {
            const res = await storyApi.searchMusic(query);
            return res?.result || [];
        } catch (err) {
            return rejectWithValue(err?.message || "Tìm nhạc thất bại");
        }
    }
);


const storySlice = createSlice({
    name: "stories",
    initialState: {
        // Stories ở feed (của người mình follow)
        feedStories: [],
        loadingFeed: false,
        feedError: null,

        // Stories của mình
        myStories: [],
        loadingMine: false,
        mineError: null,

        // Kho lưu trữ
        archive: [],
        loadingArchive: false,
        archiveError: null,

        // Tạo story
        creating: false,
        createError: null,

        // Tìm nhạc
        musicResults: [],
        loadingMusic: false,
        musicError: null,
    },
    reducers: {
        // Xóa kết quả tìm nhạc khi đóng modal
        clearMusicResults(state) {
            state.musicResults = [];
            state.musicError = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // fetchFeedStories
            .addCase(fetchFeedStories.pending, (state) => {
                state.loadingFeed = true;
                state.feedError = null;
            })
            .addCase(fetchFeedStories.fulfilled, (state, action) => {
                state.loadingFeed = false;
                state.feedStories = action.payload;
            })
            .addCase(fetchFeedStories.rejected, (state, action) => {
                state.loadingFeed = false;
                state.feedError = action.payload;
            })

            // fetchMyStories
            .addCase(fetchMyStories.pending, (state) => {
                state.loadingMine = true;
            })
            .addCase(fetchMyStories.fulfilled, (state, action) => {
                state.loadingMine = false;
                state.myStories = action.payload;
            })
            .addCase(fetchMyStories.rejected, (state, action) => {
                state.loadingMine = false;
                state.mineError = action.payload;
            })

            // fetchArchive
            .addCase(fetchArchive.pending, (state) => {
                state.loadingArchive = true;
            })
            .addCase(fetchArchive.fulfilled, (state, action) => {
                state.loadingArchive = false;
                state.archive = action.payload;
            })
            .addCase(fetchArchive.rejected, (state, action) => {
                state.loadingArchive = false;
                state.archiveError = action.payload;
            })

            // createStory
            .addCase(createStory.pending, (state) => {
                state.creating = true;
                state.createError = null;
            })
            .addCase(createStory.fulfilled, (state, action) => {
                state.creating = false;
                // Thêm story mới vào đầu danh sách của mình
                state.myStories = [action.payload, ...state.myStories];
            })
            .addCase(createStory.rejected, (state, action) => {
                state.creating = false;
                state.createError = action.payload;
            })

            // deleteStory
            .addCase(deleteStory.fulfilled, (state, action) => {
                const { storyId } = action.payload;
                state.myStories = state.myStories.filter((s) => s.id !== storyId);
                state.feedStories = state.feedStories.filter((s) => s.id !== storyId);
            })

            // markStoryViewed — cập nhật viewedByCurrentUser trong feed
            .addCase(markStoryViewed.fulfilled, (state, action) => {
                const { storyId } = action.payload;
                const story = state.feedStories.find((s) => s.id === storyId);
                if (story) story.viewedByCurrentUser = true;
            })

            // searchMusic
            .addCase(searchMusic.pending, (state) => {
                state.loadingMusic = true;
                state.musicError = null;
            })
            .addCase(searchMusic.fulfilled, (state, action) => {
                state.loadingMusic = false;
                state.musicResults = action.payload;
            })
            .addCase(searchMusic.rejected, (state, action) => {
                state.loadingMusic = false;
                state.musicError = action.payload;
            });
    },
});

export const { clearMusicResults } = storySlice.actions;
export default storySlice.reducer;


export const selectFeedStories = (state) => state.stories.feedStories;
export const selectFeedStoriesLoading = (state) => state.stories.loadingFeed;

export const selectMyStories = (state) => state.stories.myStories;
export const selectMyStoriesLoading = (state) => state.stories.loadingMine;

export const selectArchive = (state) => state.stories.archive;
export const selectArchiveLoading = (state) => state.stories.loadingArchive;

export const selectStoriesCreating = (state) => state.stories.creating;
export const selectStoriesCreateError = (state) => state.stories.createError;

export const selectMusicResults = (state) => state.stories.musicResults;
export const selectMusicLoading = (state) => state.stories.loadingMusic;
