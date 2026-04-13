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

    // User info
    private String userId;
    private String username;
    private String fullName;
    private String avatarUrl;

    // Media
    private List<String> mediaUrls;

    // Interaction
    private Long commentCount;
    private Long likeCount;
    private Long repostCount;

    // Trạng thái của User hiện tại
    private Boolean likedByCurrentUser;
    private Boolean repostedByCurrentUser;

    // Repost info
    private String repostOfId;
    private String originalUserId;
    private String originalUsername;
    private String originalFullName;
    private String originalAvatarUrl;
}
