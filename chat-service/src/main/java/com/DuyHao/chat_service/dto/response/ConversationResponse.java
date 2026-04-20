package com.DuyHao.chat_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConversationResponse {
    String id;
    String type;
    String lastMessageContent;
    LocalDateTime lastMessageTimestamp;
    LocalDateTime createdAt;
    boolean unread;

    // Partner info for 1-1 chat
    String conversationName;
    String conversationAvatar;
    String partnerId;
    boolean isOnline;
}
