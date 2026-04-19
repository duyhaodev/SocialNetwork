package com.DuyHao.chat_service.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RealtimeMessage {
    String toUserId;
    String type;    // e.g., NOTIFICATION, CHAT, FOLLOW
    Object payload;
}
