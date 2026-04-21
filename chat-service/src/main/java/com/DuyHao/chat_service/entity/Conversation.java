package com.DuyHao.chat_service.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
@FieldDefaults(level = AccessLevel.PRIVATE)
@Document(collection = "conversations")
public class Conversation {
    @Id
    String id;

    String type; // DIRECT, GROUP

    String name;
    String avatarUrl;
    String createdBy;

    @Indexed(unique = true, sparse = true)
    String participantsHash; // Dùng cho chat 1-1: sort(userId1, userId2).join("_")

    List<Participant> participants;

    String lastMessageContent;
    LocalDateTime lastMessageTimestamp;

    LocalDateTime createdAt;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Participant {
        String userId;
        @Builder.Default
        boolean unread = false;
        @Builder.Default
        boolean isAdmin = false;
    }
}
