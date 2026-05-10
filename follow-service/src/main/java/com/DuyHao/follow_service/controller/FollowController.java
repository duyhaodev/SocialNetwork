package com.DuyHao.follow_service.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.DuyHao.follow_service.dto.FollowResponse;
import com.DuyHao.follow_service.service.FollowService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/follow")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    @PostMapping("/{followingId}/toggle")
    public ResponseEntity<FollowResponse> toggleFollow(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String followingId) {

        String followerId = jwt.getSubject();
        boolean isFollowing = followService.isFollowing(followerId, followingId);

        FollowResponse response;
        if (isFollowing) {
            response = followService.unfollowUser(followerId, followingId);
        } else {
            response = followService.followUser(followerId, followingId);
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{targetUserId}")
    public ResponseEntity<FollowResponse> getFollowStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String targetUserId) {

        String currentUserId = jwt.getSubject();
        return ResponseEntity.ok(followService.getFollowStatus(currentUserId, targetUserId));
    }
}
