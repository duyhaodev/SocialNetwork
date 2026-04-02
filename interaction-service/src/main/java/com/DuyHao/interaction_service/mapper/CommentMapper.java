package com.DuyHao.interaction_service.mapper;

import com.DuyHao.interaction_service.dto.response.CommentResponse;
import com.DuyHao.interaction_service.dto.response.UserResponse;
import com.DuyHao.interaction_service.entity.Comment;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CommentMapper {

    public CommentResponse toResponse(
            Comment comment,
            UserResponse user,
            List<String> mediaUrls,
            long likeCount,
            boolean liked
    ) {
        return CommentResponse.builder()
                .id(comment.getId())

                // user
                .userId(user != null ? user.getId() : null)
                .username(user != null ? user.getUserName() : null)
                .fullName(user != null ? user.getFullName() : null)
                .avatarUrl(user != null ? user.getAvatarUrl() : null)

                // comment
                .postId(comment.getPostId())
                .content(comment.getContent())
                .parentId(comment.getParentId())
                .createdAt(comment.getCreatedAt())

                // interaction
                .likeCount(likeCount)
                .likedByCurrentUser(liked)

                // media
                .mediaUrls(mediaUrls)
                .build();
    }
}