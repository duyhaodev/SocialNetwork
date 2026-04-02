package com.DuyHao.interaction_service.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostResponse {
    private String id;
    private String content;
    private String scope;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // user info
    private String userId;
    private String username;
    private String fullName;
    private String avatarUrl;

    // media
    private List<String> mediaUrls;
    private List<String> mediaIds;
    // interaction
    private Long commentCount;
    private Long likeCount;
    private Long repostCount;

    private Boolean likedByCurrentUser;
    private Boolean repostedByCurrentUser;

    // repost info
    private String repostOfId;
    private String originalUserId;
    private String originalUsername;
    private String originalFullName;
    private String originalAvatarUrl;
}
