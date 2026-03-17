package com.DuyHao.chat_service.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Document(collection = "web_socket_sessions")
public class WebSocketSession {
    @Id
    String id;

    @Indexed(unique = true)
    String socketSessionId;

    @Indexed
    String userId;

    LocalDateTime createdAt;
}
