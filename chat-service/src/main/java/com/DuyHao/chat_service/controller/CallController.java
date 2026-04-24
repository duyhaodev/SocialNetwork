package com.DuyHao.chat_service.controller;

import com.DuyHao.chat_service.dto.ApiResponse;
import com.DuyHao.chat_service.dto.request.CallRequest;
import com.DuyHao.chat_service.dto.response.CallResponse;
import com.DuyHao.chat_service.service.CallService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/calls")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CallController {
    CallService callService;

    @PostMapping("/initiate")
    ApiResponse<CallResponse> initiateCall(@RequestBody CallRequest request) {
        return ApiResponse.<CallResponse>builder()
                .result(callService.initiateCall(request))
                .build();
    }

    @PostMapping("/accept/{callId}")
    ApiResponse<CallResponse> acceptCall(@PathVariable String callId) {
        return ApiResponse.<CallResponse>builder()
                .result(callService.acceptCall(callId))
                .build();
    }

    @PostMapping("/reject/{callId}")
    ApiResponse<CallResponse> rejectCall(@PathVariable String callId) {
        return ApiResponse.<CallResponse>builder()
                .result(callService.rejectCall(callId))
                .build();
    }

    @PostMapping("/cancel/{callId}")
    ApiResponse<CallResponse> cancelCall(@PathVariable String callId) {
        return ApiResponse.<CallResponse>builder()
                .result(callService.cancelCall(callId))
                .build();
    }

    @PostMapping("/end/{callId}")
    ApiResponse<CallResponse> endCall(@PathVariable String callId) {
        return ApiResponse.<CallResponse>builder()
                .result(callService.endCall(callId))
                .build();
    }
}
