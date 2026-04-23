package com.DuyHao.post_service.mapper;

import com.DuyHao.post_service.dto.response.InteractionResponse;
import com.DuyHao.post_service.dto.response.PostResponse;
import com.DuyHao.post_service.dto.response.UserResponse;
import com.DuyHao.post_service.entity.Post;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class PostMapper {

    public PostResponse toResponse(
            Post post,
            UserResponse user,
            List<String> mediaUrls,
            InteractionResponse interaction,
            UserResponse originalUser) {

        return PostResponse.builder()
                .id(post.getId())
                .content(post.getContent())
                .scope(post.getScope())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())

                // Thông tin người đăng bài
                .userId(user.getUserId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())

                // Media và Interaction
                .mediaUrls(mediaUrls)
                .likeCount(interaction != null ? interaction.getLikeCount() : 0L)
                .commentCount(interaction != null ? interaction.getCommentCount() : 0L)
                .repostCount(interaction != null ? interaction.getRepostCount() : 0L)
                .likedByCurrentUser(interaction != null && Boolean.TRUE.equals(interaction.getLikedByCurrentUser()))
                .repostedByCurrentUser(
                        interaction != null && Boolean.TRUE.equals(interaction.getRepostedByCurrentUser()))

                .repostOfId(post.getRepostOf() != null ? post.getRepostOf().getId() : null)
                .originalContent(post.getRepostOf() != null ? post.getRepostOf().getContent() : null)
                .originalUserId(originalUser != null ? originalUser.getUserId() : null)
                .originalUsername(originalUser != null ? originalUser.getUsername() : null)
                .originalFullName(originalUser != null ? originalUser.getFullName() : null)
                .originalAvatarUrl(originalUser != null ? originalUser.getAvatarUrl() : null)
                .build();
    }
}