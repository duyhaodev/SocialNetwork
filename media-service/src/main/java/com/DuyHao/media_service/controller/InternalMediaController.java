package com.DuyHao.media_service.controller;

import com.DuyHao.media_service.service.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/internal/media")
@RequiredArgsConstructor
public class InternalMediaController {

    private final MediaService mediaService;

    @PutMapping("/assign")
    public void assignMediaToPost(
            @RequestParam String postId,
            @RequestBody List<String> mediaIds) {
        mediaService.assignMediaToPost(postId, mediaIds);
    }
}