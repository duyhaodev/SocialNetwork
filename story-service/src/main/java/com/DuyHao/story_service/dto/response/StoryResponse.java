package com.DuyHao.story_service.dto.response;

import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StoryResponse {

    String id;

    // Thông tin chủ story
    String userId;
    String username;
    String fullName;
    String avatarUrl;

    String mediaType;
    String mediaUrl;

    String textContent;
    String backgroundColor;

    // Nhạc
    String musicTitle;
    String musicArtist;
    String musicAlbumArt;
    String musicPreviewUrl;
    Integer musicStartMs;
    String fontId;

    String scope;
    LocalDateTime createdAt;
    LocalDateTime expiresAt;
    boolean archived;

    Long viewCount;
    boolean viewedByCurrentUser;
}
