package com.DuyHao.chat_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LinkItemResponse {
    String messageId;
    String url;
    LocalDateTime createdAt;
    SenderInfo sender;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class SenderInfo {
        String id;
        String fullName;
        String avatarUrl;
    }
}
