package com.DuyHao.search_service.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostResponse {
    String id;
    String content;
    String scope;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    String userId;
    String username;
    String fullName;
    String avatarUrl;

    List<String> mediaUrls;

    Long commentCount;
    Long likeCount;
    Long repostCount;

    Boolean likedByCurrentUser;
    Boolean repostedByCurrentUser;

    String repostOfId;
    String originalContent;
    String originalUserId;
    String originalUsername;
    String originalFullName;
    String originalAvatarUrl;
}
