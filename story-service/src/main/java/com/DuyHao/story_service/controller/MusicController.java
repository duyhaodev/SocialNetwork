package com.DuyHao.story_service.controller;

import com.DuyHao.story_service.dto.ApiResponse;
import com.DuyHao.story_service.dto.response.MusicSearchResponse;
import com.DuyHao.story_service.service.SpotifyService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class MusicController {

    private final SpotifyService spotifyService;

    // Tìm nhạc Spotify theo từ khóa
    @GetMapping("/music/search")
    public ApiResponse<List<MusicSearchResponse>> searchMusic(
            @RequestParam String q) {
        return ApiResponse.<List<MusicSearchResponse>>builder()
                .result(spotifyService.search(q))
                .build();
    }
}
