package com.DuyHao.chat_service.controller;

import com.DuyHao.chat_service.dto.ApiResponse;
import com.DuyHao.chat_service.dto.request.MessageRequest;
import com.DuyHao.chat_service.dto.response.LinkItemResponse;
import com.DuyHao.chat_service.dto.response.MessageResponse;
import com.DuyHao.chat_service.service.MessageService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    @GetMapping("/{conversationId}/paged")
    ApiResponse<Map<String, Object>> getMessagesPaged(
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        MessageService.PagedMessagesResult result = messageService.getMessagesPaged(conversationId, page, size);
        return ApiResponse.<Map<String, Object>>builder()
                .result(Map.of(
                        "messages", result.messages(),
                        "hasMore", result.hasMore(),
                        "page", page
                ))
                .build();
    }

    @GetMapping("/{conversationId}/search")
    ApiResponse<Map<String, Object>> searchMessages(
            @PathVariable String conversationId,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        MessageService.PagedMessagesResult result = messageService.searchMessages(conversationId, keyword, page, size);
        return ApiResponse.<Map<String, Object>>builder()
                .result(Map.of(
                        "messages", result.messages(),
                        "hasMore", result.hasMore(),
                        "page", page
                ))
                .build();
    }

    @GetMapping("/{conversationId}/page-of/{messageId}")
    ApiResponse<Map<String, Object>> getPageOfMessage(
            @PathVariable String conversationId,
            @PathVariable String messageId,
            @RequestParam(defaultValue = "30") int pageSize) {
        int pageIndex = messageService.getPageOfMessage(conversationId, messageId, pageSize);
        return ApiResponse.<Map<String, Object>>builder()
                .result(Map.of("pageIndex", pageIndex))
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

    @GetMapping("/{conversationId}/links")
    ApiResponse<Map<String, Object>> getLinks(
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        MessageService.PagedLinksResult result = messageService.getLinks(conversationId, page, size);
        return ApiResponse.<Map<String, Object>>builder()
                .result(Map.of(
                        "links", result.links(),
                        "hasMore", result.hasMore(),
                        "page", page
                ))
                .build();
    }
}
