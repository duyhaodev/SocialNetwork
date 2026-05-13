package com.DuyHao.interaction_service.controller;

import com.DuyHao.interaction_service.dto.response.InteractionResponse;
import com.DuyHao.interaction_service.repository.CommentRepository;
import com.DuyHao.interaction_service.service.InteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/interactions")
@RequiredArgsConstructor
public class InternalInteractionController {

    private final InteractionService interactionService;
    private final CommentRepository commentRepository;

    @GetMapping("/{postId}")
    public InteractionResponse getInteractionStats(@PathVariable String postId, @AuthenticationPrincipal Jwt jwt) {
        String userId = (jwt != null) ? jwt.getSubject() : null;
        return interactionService.getInteractionStats(postId, userId);
    }

    // Xóa tất cả comments của 1 post (gọi từ post-service khi xóa post)
    @DeleteMapping("/{postId}/comments")
    @org.springframework.transaction.annotation.Transactional
    public void deleteCommentsByPost(@PathVariable String postId) {
        commentRepository.deleteByPostId(postId);
    }
}
