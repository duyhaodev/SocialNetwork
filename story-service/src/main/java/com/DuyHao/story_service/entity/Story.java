package com.DuyHao.story_service.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(
        name = "stories",
        indexes = {
            @Index(name = "idx_story_user_id", columnList = "user_id"),
            @Index(name = "idx_story_expires_at", columnList = "expires_at")
        })
public class Story {

    @Id
    @Column(length = 36)
    String id;

    @Column(name = "user_id", nullable = false, length = 36)
    String userId;

    @Column(name = "media_type", length = 10)
    String mediaType;

    @Column(name = "media_id", length = 36)
    String mediaId;

    @Column(name = "text_content")
    String textContent;

    @Column(name = "background_color")
    String backgroundColor;

    // Nhạc
    @Column(name = "music_title")
    String musicTitle;

    @Column(name = "music_artist")
    String musicArtist;

    @Column(name = "music_album_art")
    String musicAlbumArt;

    @Column(name = "music_preview_url")
    String musicPreviewUrl;

    // Bắt đầu play trong đoạn preview 30s
    @Column(name = "music_start_ms")
    Integer musicStartMs;

    @Column(length = 20)
    @Builder.Default
    String scope = "PUBLIC";

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @Column(name = "expires_at")
    LocalDateTime expiresAt;

    @Column(nullable = false)
    @Builder.Default
    boolean archived = false;

    @PrePersist
    public void prePersist() {
        if (id == null || id.isBlank()) {
            id = java.util.UUID.randomUUID().toString();
        }
        createdAt = LocalDateTime.now();
        expiresAt = createdAt.plusHours(24);
    }
}
