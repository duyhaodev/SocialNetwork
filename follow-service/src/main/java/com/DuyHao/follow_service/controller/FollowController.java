package com.DuyHao.follow_service.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.DuyHao.follow_service.dto.FollowResponse;
import com.DuyHao.follow_service.dto.SuggestionResponse;
import com.DuyHao.follow_service.service.FollowService;
import com.DuyHao.follow_service.service.SuggestionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/follow")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;
    private final SuggestionService suggestionService;

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

    @GetMapping("/suggestions")
    public ResponseEntity<List<SuggestionResponse>> getSuggestions(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        String currentUserId = jwt.getSubject();
        List<SuggestionResponse> suggestions = suggestionService.getSuggestions(currentUserId, page, size);
        return ResponseEntity.ok(suggestions);
    }
}
