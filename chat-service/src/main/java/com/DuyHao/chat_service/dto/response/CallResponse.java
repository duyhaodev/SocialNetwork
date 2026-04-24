package com.DuyHao.chat_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CallResponse {
    String id;
    String callerId;
    String calleeId;
    String conversationId;
    String type;
    String status;
    LocalDateTime startTime;
    LocalDateTime endTime;
    LocalDateTime createdAt;
}
