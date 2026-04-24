package com.DuyHao.chat_service.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Document(collection = "call_sessions")
public class CallSession {
    @Id
    String id;

    String callerId;
    String calleeId;
    String conversationId;
    
    String type; // AUDIO, VIDEO
    String status; // INITIATING, RINGING, IN_PROGRESS, COMPLETED, MISSED, REJECTED

    LocalDateTime startTime;
    LocalDateTime endTime;
    LocalDateTime createdAt;
}
