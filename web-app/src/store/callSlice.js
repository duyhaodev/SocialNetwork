import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  callStatus: 'IDLE', // 'IDLE' | 'CALLING' | 'INCOMING' | 'IN_PROGRESS'
  callData: null, // Payload: { id, callerId, calleeId, conversationId, type, status, ... }
};

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    startOutgoingCall: (state, action) => {
      state.callStatus = 'CALLING';
      state.callData = action.payload;
    },
    receiveIncomingCall: (state, action) => {
      state.callStatus = 'INCOMING';
      state.callData = action.payload;
    },
    setCallInProgress: (state, action) => {
      state.callStatus = 'IN_PROGRESS';
      // Cập nhật thêm data nếu có (ví dụ: lấy đc full payload sau khi accept)
      if (action.payload) {
        state.callData = { ...state.callData, ...action.payload };
      }
    },
    endCallAction: (state) => {
      state.callStatus = 'IDLE';
      state.callData = null;
    },
  },
});

export const { 
    startOutgoingCall, 
    receiveIncomingCall, 
    setCallInProgress, 
    endCallAction 
} = callSlice.actions;

export default callSlice.reducer;
