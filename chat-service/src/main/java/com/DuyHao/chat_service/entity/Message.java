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
@FieldDefaults(level = AccessLevel.PRIVATE)
@Document(collection = "messages")
public class Message {
    @Id
    String id;

    @Indexed
    String conversationId;

    String senderId;
    String content;
    List<MediaInfo> media;

    @Builder.Default
    boolean isRevoked = false;

    @Builder.Default
    boolean isEdited = false;

    @Builder.Default
    java.util.Map<String, String> reactions = new java.util.HashMap<>();

    LocalDateTime createdAt;
}
