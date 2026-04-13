package com.DuyHao.interaction_service.mapper;

import com.DuyHao.interaction_service.dto.response.CommentResponse;
import com.DuyHao.interaction_service.dto.response.UserResponse;
import com.DuyHao.interaction_service.entity.Comment;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CommentMapper {

    @Mapping(target = "id", source = "comment.id")
    @Mapping(target = "content", source = "comment.content")
    @Mapping(target = "postId", source = "comment.postId")
    @Mapping(target = "parentId", source = "comment.parentId")
    @Mapping(target = "createdAt", source = "comment.createdAt")

    // Map User Info
    @Mapping(target = "userId", source = "user.userId")
    @Mapping(target = "username", source = "user.username")
    @Mapping(target = "fullName", source = "user.fullName")
    @Mapping(target = "avatarUrl", source = "user.avatarUrl")

    // Map Interactions & Media
    @Mapping(target = "mediaUrls", source = "mediaUrls")
    @Mapping(target = "likeCount", source = "likeCount")
    @Mapping(target = "likedByCurrentUser", source = "liked")
    CommentResponse toResponse(
            Comment comment, UserResponse user, List<String> mediaUrls, long likeCount, boolean liked);
}
