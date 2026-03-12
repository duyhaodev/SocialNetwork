import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isOpen: false,
  prefill: { text: "", files: [] },
};

const composerSlice = createSlice({
  name: "composer",
  initialState,
  reducers: {
    openComposer(state, action) {
      state.isOpen = true;
      state.prefill = action.payload || initialState.prefill;
    },
    closeComposer(state) {
      state.isOpen = false;
      state.prefill = initialState.prefill;
    },
  },
});

export const { openComposer, closeComposer } = composerSlice.actions;
export const selectComposerOpen = (s) => s.composer.isOpen;
export const selectComposerPrefill = (s) => s.composer.prefill;
export default composerSlice.reducer;
