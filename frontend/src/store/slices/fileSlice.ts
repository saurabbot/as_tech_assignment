import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiUtils from "../../lib/api";
export interface File {
  id: number;
  name: string;
  owner: {
    id: number;
    email: string;
    full_name: string;
  };
  file_size: number;
  created_at: string;
  updated_at: string;
  shared_with_count: number;
  file_hash: string;
}

export interface FileState {
  files: File[];
  loading: boolean;
  error: string | null;
  uploadProgress: number;
}

const initialState: FileState = {
  files: [],
  loading: false,
  error: null,
  uploadProgress: 0,
};

export const fetchFiles = createAsyncThunk("files/fetchFiles", async () => {
  try {
    const response = await apiUtils.files.getList();
    console.log("Files fetched:", response); // Debug log
    return response;
  } catch (error) {
    console.error("Fetch files error:", error);
    throw error;
  }
});

export const deleteFile = createAsyncThunk(
  "files/deleteFile",
  async (fileId: number) => {
    await apiUtils.files.delete(fileId);
    return fileId;
  }
);

export const downloadFile = createAsyncThunk(
  "files/downloadFile",
  async (fileId: number, { getState }) => {
    const blob = await apiUtils.files.download(fileId);
    const state = getState() as { files: FileState };
    const file = state.files.files.find((f) => f.id === fileId);
    if (!file) throw new Error("File not found");
    return { blob, fileName: file.name };
  }
);
export const uploadFile = createAsyncThunk(
  "files/uploadFile",
  async (formData: FormData, { dispatch }) => {
    const response = await apiUtils.files.upload(formData, (progress) => {
      dispatch(setUploadProgress(progress));
    });
    // After successful upload, fetch the updated file list
    dispatch(fetchFiles());
    return response;
  }
);

const fileSlice = createSlice({
  name: "files",
  initialState,
  reducers: {
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFiles.pending, (state) => {
        state.loading = true;
        state.error = null;
        console.log("Fetch files pending"); // Debug log
      })
      .addCase(fetchFiles.fulfilled, (state, action) => {
        state.loading = false;
        state.files = action.payload;
        console.log("Files stored in state:", state.files); // Debug log
      })
      .addCase(fetchFiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch files";
        console.error("Fetch files failed:", action.error); // Debug log
      })
      .addCase(deleteFile.fulfilled, (state, action) => {
        state.files = state.files.filter((file) => file.id !== action.payload);
      })
      .addCase(downloadFile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(downloadFile.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(downloadFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to download file";
      })
      .addCase(uploadFile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.uploadProgress = 0;
      })
      .addCase(uploadFile.fulfilled, (state) => {
        state.loading = false;
        state.uploadProgress = 100;
      })
      .addCase(uploadFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to upload file";
        state.uploadProgress = 0;
      });
  },
});

export const { setUploadProgress, clearError } = fileSlice.actions;
export default fileSlice.reducer;
