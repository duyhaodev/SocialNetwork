import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  callStatus: 'IDLE', // 'IDLE' | 'CALLING' | 'INCOMING' | 'IN_PROGRESS'
  callData: null, // Payload: { id, callerId, calleeId, conversationId, type, status, ... }
  isAnotherTabBusy: false, // Flag to block calling if another tab is in a call
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
      // Chỉ nhận cuộc gọi mới nếu đang IDLE và không bận ở tab khác
      if (state.callStatus === 'IDLE' && !state.isAnotherTabBusy) {
        state.callStatus = 'INCOMING';
        state.callData = action.payload;
      }
    },
    setCallInProgress: (state, action) => {
      // Lọc theo ID: Chỉ update nếu khớp ID cuộc gọi hiện tại
      if (state.callData && action.payload && state.callData.id === action.payload.id) {
        state.callStatus = 'IN_PROGRESS';
        state.callData = { ...state.callData, ...action.payload };
      }
    },
    endCallAction: (state, action) => {
      // Nếu có payload (từ socket), kiểm tra ID. 
      // Nếu không có payload (từ nút bấm local), cứ reset.
      if (!action.payload || (state.callData && action.payload.id === state.callData.id)) {
        state.callStatus = 'IDLE';
        state.callData = null;
      }
    },
    setAnotherTabBusy: (state, action) => {
      state.isAnotherTabBusy = action.payload;
    }
  },
});

export const { 
    startOutgoingCall, 
    receiveIncomingCall, 
    setCallInProgress, 
    endCallAction,
    setAnotherTabBusy
} = callSlice.actions;

export default callSlice.reducer;
