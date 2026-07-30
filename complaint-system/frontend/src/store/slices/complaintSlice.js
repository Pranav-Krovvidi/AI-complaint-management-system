import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { complaintsApi } from "../../api/complaintsApi";

export const fetchComplaints = createAsyncThunk(
  "complaints/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await complaintsApi.list(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Failed to load complaints");
    }
  }
);

export const fetchComplaintById = createAsyncThunk(
  "complaints/fetchOne",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await complaintsApi.get(id);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Failed to load complaint");
    }
  }
);

export const createComplaint = createAsyncThunk(
  "complaints/create",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await complaintsApi.create(payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Failed to create complaint");
    }
  }
);

export const updateComplaint = createAsyncThunk(
  "complaints/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const { data } = await complaintsApi.update(id, payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Failed to update complaint");
    }
  }
);

export const fetchDashboardStats = createAsyncThunk(
  "complaints/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await complaintsApi.dashboard();
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Failed to load dashboard");
    }
  }
);

const initialState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  filters: { status: "", category: "", severity: "", search: "" },
  selected: null,
  dashboard: null,
  listStatus: "idle",
  detailStatus: "idle",
  error: null,
};

const complaintSlice = createSlice({
  name: "complaints",
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
    },
    setPage(state, action) {
      state.page = action.payload;
    },
    clearSelected(state) {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComplaints.pending, (state) => {
        state.listStatus = "loading";
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.items = action.payload.items;
        state.total = action.payload.total;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.listStatus = "failed";
        state.error = action.payload;
      })
      .addCase(fetchComplaintById.pending, (state) => {
        state.detailStatus = "loading";
      })
      .addCase(fetchComplaintById.fulfilled, (state, action) => {
        state.detailStatus = "succeeded";
        state.selected = action.payload;
      })
      .addCase(fetchComplaintById.rejected, (state, action) => {
        state.detailStatus = "failed";
        state.error = action.payload;
      })
      .addCase(createComplaint.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateComplaint.fulfilled, (state, action) => {
        state.selected = action.payload;
        const idx = state.items.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.dashboard = action.payload;
      });
  },
});

export const { setFilters, setPage, clearSelected } = complaintSlice.actions;
export default complaintSlice.reducer;
