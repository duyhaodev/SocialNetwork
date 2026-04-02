package com.DuyHao.media_service.mapper;

import com.DuyHao.media_service.dto.response.MediaResponse;
import com.DuyHao.media_service.entity.Media;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class MediaMapper {

    // Mapping 1 Media entity → 1 MediaResponse
    public MediaResponse toResponse(Media media) {
        if (media == null) return null;

        return MediaResponse.builder()
                .id(media.getId())
                .mediaUrl(media.getMediaUrl())
                .mediaType(media.getMediaType())
                .postId(media.getPostId())
                .commentId(media.getCommentId())
                .build();
    }

    // Mapping list of Media → list of MediaResponse
    public List<MediaResponse> toResponseList(List<Media> mediaList) {
        if (mediaList == null || mediaList.isEmpty()) return List.of();

        return mediaList.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
}