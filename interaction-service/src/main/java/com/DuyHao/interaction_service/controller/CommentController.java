package com.DuyHao.interaction_service.controller;

import com.DuyHao.interaction_service.dto.request.CommentRequest;
import com.DuyHao.interaction_service.dto.response.CommentResponse;
import com.DuyHao.interaction_service.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // ================= CREATE =================
    @PostMapping
    public CommentResponse createComment(
            @RequestBody CommentRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject(); // 🔥 lấy trực tiếp userId

        return commentService.create(userId, request);
    }

    // ================= GET =================
    @GetMapping("/post/{postId}")
    public List<CommentResponse> getComments(
            @PathVariable String postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String currentUserId = (jwt != null) ? jwt.getSubject() : null;

        return commentService.getCommentsByPost(postId, currentUserId, page, size);
    }

    // ================= DELETE =================
    @DeleteMapping("/{commentId}")
    public void deleteComment(
            @PathVariable String commentId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();

        commentService.deleteComment(userId, commentId);
    }
}