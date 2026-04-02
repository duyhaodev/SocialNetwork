package com.DuyHao.interaction_service.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "comments")
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "user_id", nullable = false)
    String userId;

    @Column(name = "post_id", nullable = false)
    String postId;

    String content;

    @Column(name = "parent_id")
    String parentId;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @ElementCollection
    @CollectionTable(name = "comment_media_ids", joinColumns = @JoinColumn(name = "comment_id"))
    @Column(name = "media_id")
    @Builder.Default
    List<String> mediaIds = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public void addMediaId(String mediaId) {
        if (mediaIds == null) mediaIds = new ArrayList<>();
        mediaIds.add(mediaId);
    }
}
