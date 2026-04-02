package com.DuyHao.media_service.controller;

import com.DuyHao.media_service.dto.response.MediaResponse;
import com.DuyHao.media_service.service.MediaService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/media")
public class MediaController {

    private final MediaService mediaService;

    // ==================== UPLOAD 1 HOẶC NHIỀU FILE ====================
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<MediaResponse> upload(
            @RequestPart("files") List<MultipartFile> files,
            @RequestParam(required = false) String postId,
            @RequestParam(required = false) String commentId) {
        return mediaService.uploadMultiple(files, postId, commentId);
    }

    // ==================== GET BY POST ====================
    @GetMapping("/post/{postId}")
    public List<MediaResponse> getByPostId(@PathVariable String postId) {
        return mediaService.getByPostId(postId);
    }

    // ==================== GET BY COMMENT ====================
    @GetMapping("/comment/{commentId}")
    public List<MediaResponse> getByCommentId(@PathVariable String commentId) {
        return mediaService.getByCommentId(commentId);
    }

    // ==================== DELETE BY POST ====================
    @DeleteMapping("/post/{postId}")
    public void deleteByPostId(@PathVariable String postId) {
        mediaService.deleteByPostId(postId);
    }

    // ==================== DELETE BY COMMENT ====================
    @DeleteMapping("/comment/{commentId}")
    public void deleteByCommentId(@PathVariable String commentId) {
        mediaService.deleteByCommentId(commentId);
    }
}
