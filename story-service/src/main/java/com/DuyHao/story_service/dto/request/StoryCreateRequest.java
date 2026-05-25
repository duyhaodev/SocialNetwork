package com.DuyHao.story_service.dto.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoryCreateRequest {

    private String mediaType;
    private String mediaId;

    private String textContent;
    private String backgroundColor;

    private String musicTitle;
    private String musicArtist;
    private String musicAlbumArt;
    private String musicPreviewUrl;
    private Integer musicStartMs;

    private String scope;
}
