package com.DuyHao.chat_service.controller;

import com.DuyHao.chat_service.dto.request.ApiResponse;
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
}
