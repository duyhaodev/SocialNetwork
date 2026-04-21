package com.DuyHao.realtime_service.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RealtimeMessage {
    String toUserId;
    String toRoomId;
    String type;    // e.g., NOTIFICATION, CHAT, FOLLOW
    Object payload;
}
