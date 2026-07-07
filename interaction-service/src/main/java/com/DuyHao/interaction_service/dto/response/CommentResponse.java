package com.DuyHao.interaction_service.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommentResponse {

    String id;
    // user info
    String userId;
    String username;
    String fullName;
    String avatarUrl;
    // comment info
    String postId;
    String content;
    String parentId;
    LocalDateTime createdAt;
    // interaction
    // interaction
    long likeCount;
    boolean likedByCurrentUser;
    long replyCount;
    Boolean isHidden;
    // media
    List<String> mediaUrls;
}
