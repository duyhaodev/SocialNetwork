package com.DuyHao.chat_service.controller;

import com.DuyHao.chat_service.dto.request.ApiResponse;
import com.DuyHao.chat_service.dto.request.ConversationRequest;
import com.DuyHao.chat_service.dto.response.ConversationResponse;
import com.DuyHao.chat_service.service.ConversationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/conversations")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ConversationController {
    ConversationService conversationService;

    @PostMapping("/create")
    ApiResponse<ConversationResponse> createConversation(@RequestBody ConversationRequest request) {
        return ApiResponse.<ConversationResponse>builder()
                .result(conversationService.create(request))
                .build();
    }

    @GetMapping("/my-conversations")
    ApiResponse<List<ConversationResponse>> myConversations() {
        return ApiResponse.<List<ConversationResponse>>builder()
                .result(conversationService.myConversations())
                .build();
    }

    @PutMapping("/mark-as-read/{conversationId}")
    ApiResponse<Boolean> markAsRead(@PathVariable String conversationId) {
        return ApiResponse.<Boolean>builder()
                .result(conversationService.markAsRead(conversationId))
                .build();
    }
}
