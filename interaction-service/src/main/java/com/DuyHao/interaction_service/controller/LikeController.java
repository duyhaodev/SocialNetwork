package com.DuyHao.interaction_service.controller;

import com.DuyHao.interaction_service.dto.response.LikeResponse;
import com.DuyHao.interaction_service.service.LikeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class LikeController {

    private final LikeService likeService;

    // Toggle Like cho Post
    @PostMapping("/posts/{postId}/likes/toggle")
    public LikeResponse togglePostLike(
            @PathVariable String postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        return likeService.togglePostLike(postId, userId);
    }

    // Toggle Like cho Comment
    @PostMapping("/comments/{commentId}/likes/toggle")
    public LikeResponse toggleCommentLike(
            @PathVariable String commentId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        return likeService.toggleCommentLike(commentId, userId);
    }
}