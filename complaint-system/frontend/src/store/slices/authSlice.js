import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

export const login = createAsyncThunk("auth/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    // Backend uses OAuth2PasswordRequestForm -> expects x-www-form-urlencoded
    // with 'username' and 'password' fields.
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);

    const { data } = await axiosClient.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    localStorage.setItem("access_token", data.access_token);

    const me = await axiosClient.get("/users/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    return me.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "Login failed");
  }
});

export const register = createAsyncThunk("auth/register", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.post("/auth/register", payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "Registration failed");
  }
});

export const fetchCurrentUser = createAsyncThunk("auth/fetchCurrentUser", async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosClient.get("/users/me");
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "Could not load user");
  }
});

const initialState = {
  user: null,
  isAuthenticated: !!localStorage.getItem("access_token"),
  status: "idle", // idle | loading | succeeded | failed
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      localStorage.removeItem("access_token");
      state.user = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
