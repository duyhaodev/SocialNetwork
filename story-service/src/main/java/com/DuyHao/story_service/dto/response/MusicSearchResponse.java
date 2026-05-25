package com.DuyHao.story_service.dto.response;

import lombok.*;

// Trả về khi user tìm nhạc Spotify để gắn vào story
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MusicSearchResponse {
    private String title;
    private String artist;
    private String albumArt;
    private String previewUrl;
}
