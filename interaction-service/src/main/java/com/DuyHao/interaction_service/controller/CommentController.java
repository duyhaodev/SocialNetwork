package com.DuyHao.interaction_service.controller;

import java.util.List;

import com.DuyHao.interaction_service.dto.ApiResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.DuyHao.interaction_service.dto.request.CommentRequest;
import com.DuyHao.interaction_service.dto.response.CommentResponse;
import com.DuyHao.interaction_service.service.CommentService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // ================= CREATE =================
    @PostMapping
    public ApiResponse<CommentResponse> createComment(
            @RequestBody CommentRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();

        return ApiResponse.<CommentResponse>builder()
                .result(commentService.create(userId, request))
                .build();
    }

    // ================= GET COMMENT BY POST =================
    @GetMapping("/post/{postId}")
    public ApiResponse<List<CommentResponse>> getComments(
            @PathVariable String postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = (jwt != null) ? jwt.getSubject() : null;

        return ApiResponse.<List<CommentResponse>>builder()
                .result(commentService.getCommentsByPost(postId, currentUserId, page, size))
                .build();
    }
    // ================= GET REPLIES  =================
    @GetMapping("/{commentId}/replies")
    public ApiResponse<List<CommentResponse>> getReplies(
            @PathVariable String commentId,
            @AuthenticationPrincipal Jwt jwt) {

        String currentUserId = (jwt != null) ? jwt.getSubject() : null;
        return ApiResponse.<List<CommentResponse>>builder()
                .result(commentService.getReplies(commentId, currentUserId))
                .build();
    }

    // ================= DELETE =================
    @DeleteMapping("/{commentId}")
    public ApiResponse<Void> deleteComment(
            @PathVariable String commentId,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        commentService.deleteComment(userId, commentId);

        return ApiResponse.<Void>builder()
                .message("Comment deleted successfully")
                .build();
    }
}