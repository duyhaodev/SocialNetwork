package com.DuyHao.story_service.mapper;

import com.DuyHao.story_service.dto.response.StoryResponse;
import com.DuyHao.story_service.dto.response.UserProfileResponse;
import com.DuyHao.story_service.entity.Story;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface StoryMapper {

    @Mapping(target = "userId",    source = "story.userId")
    @Mapping(target = "username",  source = "user.username")
    @Mapping(target = "fullName",  source = "user.fullName")
    @Mapping(target = "avatarUrl", source = "user.avatarUrl")
    @Mapping(target = "mediaUrl",  source = "mediaUrl")
    @Mapping(target = "viewCount", source = "viewCount")
    @Mapping(target = "viewedByCurrentUser", source = "viewedByCurrentUser")
    StoryResponse toResponse(
            Story story,
            UserProfileResponse user,
            String mediaUrl,
            long viewCount,
            boolean viewedByCurrentUser);
}
