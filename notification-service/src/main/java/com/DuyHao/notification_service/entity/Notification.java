package com.DuyHao.notification_service.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Document(collection = "notifications")
public class Notification {
    @Id
    String id;

    String userId;

    String type;

    String fromUserId;

    String postId;

    String commentId;

    String message;

    Boolean isRead = false;

    LocalDateTime createdAt;

    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now().withNano(0);
        }
    }
}
