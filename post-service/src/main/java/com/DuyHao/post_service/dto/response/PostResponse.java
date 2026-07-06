package com.DuyHao.post_service.dto.response;

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
    private String groupId;
    private String groupName;
    private String status;
    private String statusReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // user info
    private String userId;
    private String username;
    private String fullName;
    private String avatarUrl;

    // media
    private List<String> mediaUrls;
    // interaction
    private Long commentCount;
    private Long likeCount;
    private Long repostCount;

    private Boolean likedByCurrentUser;
    private Boolean repostedByCurrentUser;

    // repost info
    private String repostOfId;
    private String originalContent;
    private String originalUserId;
    private String originalUsername;
    private String originalFullName;
    private String originalAvatarUrl;

    // AI generated flag — true nếu bài đăng chứa ảnh do AI tạo ra
    private Boolean isAiGenerated;

    private Boolean isPinned;

    // Sensitive content flag — true nếu user nhấn "Post anyway" khi bị cảnh báo nội dung nhạy cảm
    private Boolean isSensitiveContent;

    // tags
    private List<String> tags;
}
