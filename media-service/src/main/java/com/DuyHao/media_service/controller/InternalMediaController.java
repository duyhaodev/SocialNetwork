package com.DuyHao.media_service.controller;

import com.DuyHao.media_service.dto.response.MediaResponse;
import com.DuyHao.media_service.service.MediaService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/media")
@RequiredArgsConstructor
public class InternalMediaController {

    private final MediaService mediaService;

    // ==================== GET BY POST ====================
    @GetMapping("/post/{postId}")
    public List<MediaResponse> getByPostId(@PathVariable String postId) {

        return mediaService.getByPostId(postId);
    }

    // ==================== DELETE BY POST ====================
    @DeleteMapping("/post/{postId}")
    public void deleteByPostId(@PathVariable String postId) {

        mediaService.deleteByPostId(postId);
    }

    @PutMapping("/assign/post")
    public void assignMediaToPost(@RequestParam String postId, @RequestBody List<String> mediaIds) {
        mediaService.assignMediaToPost(postId, mediaIds);
    }

    // ==================== COMMENT ====================
    @GetMapping("/comment/{commentId}")
    public List<MediaResponse> getByCommentId(@PathVariable String commentId) {
        return mediaService.getByCommentId(commentId);
    }

    @DeleteMapping("/comment/{commentId}")
    public void deleteByCommentId(@PathVariable String commentId) {
        mediaService.deleteByCommentId(commentId);
    }

    @PutMapping("/assign/comment")
    public void assignMediaToComment(@RequestParam String commentId, @RequestBody List<String> mediaIds) {
        mediaService.assignMediaToComment(commentId, mediaIds);
    }

    // ==================== CONVERSATION ====================
    @GetMapping("/conversation/{conversationId}")
    public List<MediaResponse> getByConversationId(@PathVariable String conversationId) {
        return mediaService.getByConversationId(conversationId);
    }

    @PutMapping("/assign/conversation")
    public void assignMediaToConversation(@RequestParam String conversationId, @RequestBody List<String> mediaIds) {
        mediaService.assignMediaToConversation(conversationId, mediaIds);
    }
}
