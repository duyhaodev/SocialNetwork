import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import authApi from "../api/authApi";
import userApi from "../api/userApi";
import { getToken, removeToken, setToken } from "../api/localStorageService";

export const login = createAsyncThunk(
  "user/login",
  async (credentials, { rejectWithValue, dispatch }) => {
    try {
      const res = await authApi.login(credentials);
      if (!res || res.code !== 1000 || !res.result?.token) {
        return rejectWithValue(res || "LOGIN_FAILED");
      }
      const token = res.result.token;
      setToken(token);
      dispatch(fetchMyInfo()); // Fetch user info after successful login
      return { token };
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message || "LOGIN_ERROR");
    }
  }
);

export const verifyToken = createAsyncThunk(
  "user/verifyToken",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const token = getToken()
      if (!token) return rejectWithValue("NO_TOKEN");

      const res = await authApi.introspect(token);
      if (!res || res.code !== 1000 || !res.result?.valid) {
        removeToken();
        return rejectWithValue("INVALID_TOKEN");
      }

      // token hợp lệ -> load profile
      dispatch(fetchMyInfo());
      return { token };
    } catch (e) {
      removeToken();
      return rejectWithValue(e.response?.data || e.message || "VERIFY_ERROR");
    }
  }
);

export const fetchMyInfo = createAsyncThunk(
  "user/fetchMyInfo",
  async (_, { rejectWithValue }) => {
    try {
      const res = await userApi.getMyInfo();
      if (!res || res.code !== 1000) return rejectWithValue(res || "FETCH_MYINFO_FAILED");
      // server trả về result; map ở đây tạm thời chỉ trả nguyên result
        return res.result;
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message || "FETCH_MYINFO_ERROR");
    }
  }
);

export const logoutUser = createAsyncThunk(
  "user/logout",
  async (_, { rejectWithValue, getState }) => {
    try {
      const token = getState().user.token || localStorage.getItem("token");
      if (token) {
        await authApi.logout(token);
      }
      removeToken();
      return null;
    } catch (e) {
      // Vẫn xóa token local dù API lỗi
      removeToken();
      return rejectWithValue(e.response?.data || e.message || "LOGOUT_ERROR");
    }
  }
)

const userSlice = createSlice ({
    name: "user",
    initialState: {
        token: null,
        profile: null,
        loading: false,
        error: null,
        isAuthenticated: false,
    },

    reducers: {
        setProfile (state, action) {
            state.profile = action.payload
        },
        logout (state) {
            state.token = null;
            state.profile = null;
            state.isAuthenticated = false;
            state.error = null;
            localStorage.removeItem("token");
        }
    },
    extraReducers: (builder) => {
        builder
        // login
        .addCase (login.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase (login.fulfilled, (state, action) => {
            state.loading = false;
            state.token = action.payload.token;
            state.isAuthenticated = true;
        })
        .addCase(login.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || action.error?.message;
            state.isAuthenticated = false;
        })
        
        // verify Token
        .addCase(verifyToken.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(verifyToken.fulfilled, (state, action) => {
            state.loading = false;
            state.token = action.payload.token;
            state.isAuthenticated = true;
        })
        .addCase(verifyToken.rejected, (state, action) => {
            state.loading = false;
            state.token = null;
            state.isAuthenticated = false;
            state.error = action.payload || action.error?.message;
        })

        // fetch Myinfo
        .addCase(fetchMyInfo.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(fetchMyInfo.fulfilled, (state, action) => {
            state.loading = false;
            state.profile = action.payload;
        })
        .addCase(fetchMyInfo.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || action.error?.message;
        })

        // logout
        .addCase(logoutUser.pending, (state) => {
            state.loading = true;
        })
        .addCase(logoutUser.fulfilled, (state) => {
            state.loading = false;
            state.token = null;
            state.profile = null;
            state.isAuthenticated = false;
            state.error = null;
        })
        .addCase(logoutUser.rejected, (state, action) => {
            // Vẫn logout dù API lỗi
            state.loading = false;
            state.token = null;
            state.profile = null;
            state.isAuthenticated = false;
            state.error = action.payload || action.error?.message;
        });
    }
})

export const { logout, setProfile} = userSlice.actions;
export default userSlice.reducer;