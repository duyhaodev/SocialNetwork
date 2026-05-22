package com.DuyHao.chat_service.controller;

import com.DuyHao.chat_service.dto.ApiResponse;
import com.DuyHao.chat_service.dto.request.MessageRequest;
import com.DuyHao.chat_service.dto.response.MessageResponse;
import com.DuyHao.chat_service.service.MessageService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/messages")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MessageController {
    MessageService messageService;

    @PostMapping("/create")
    ApiResponse<MessageResponse> create(@RequestBody MessageRequest request) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.create(request))
                .build();
    }

    @GetMapping("/{conversationId}")
    ApiResponse<List<MessageResponse>> getMessages(@PathVariable String conversationId) {
        return ApiResponse.<List<MessageResponse>>builder()
                .result(messageService.getMessages(conversationId))
                .build();
    }

    @PutMapping("/revoke/{messageId}")
    ApiResponse<MessageResponse> revoke(@PathVariable String messageId) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.revokeMessage(messageId))
                .build();
    }

    @PutMapping("/edit/{messageId}")
    ApiResponse<MessageResponse> edit(@PathVariable String messageId, @RequestBody MessageRequest request) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.editMessage(messageId, request.getContent()))
                .build();
    }

    @PostMapping("/{messageId}/react")
    ApiResponse<MessageResponse> react(@PathVariable String messageId, @RequestParam String emoji) {
        return ApiResponse.<MessageResponse>builder()
                .result(messageService.reactToMessage(messageId, emoji))
                .build();
    }
}
