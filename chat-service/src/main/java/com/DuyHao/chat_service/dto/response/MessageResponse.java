package com.DuyHao.chat_service.dto.response;

import com.DuyHao.chat_service.entity.MediaInfo;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MessageResponse {
    String id;
    String conversationId;
    String content;
    List<MediaInfo> media;
    LocalDateTime createdAt;
    boolean isMe;
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
