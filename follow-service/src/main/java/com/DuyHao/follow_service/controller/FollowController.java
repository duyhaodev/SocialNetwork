package com.DuyHao.follow_service.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.DuyHao.follow_service.client.UserClient;
import com.DuyHao.follow_service.dto.FollowResponse;
import com.DuyHao.follow_service.dto.SuggestionResponse;
import com.DuyHao.follow_service.dto.UserProfileResponse;
import com.DuyHao.follow_service.exception.PrivacyException;
import com.DuyHao.follow_service.service.FollowService;
import com.DuyHao.follow_service.service.SuggestionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/follow")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;
    private final SuggestionService suggestionService;
    private final UserClient userClient;

    @PostMapping("/{followingId}/toggle")
    public ResponseEntity<FollowResponse> toggleFollow(
            @AuthenticationPrincipal Jwt jwt, @PathVariable String followingId) {

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
            @AuthenticationPrincipal Jwt jwt, @PathVariable String targetUserId) {

        String currentUserId = jwt.getSubject();
        return ResponseEntity.ok(followService.getFollowStatus(currentUserId, targetUserId));
    }

    @GetMapping("/suggestions")
    public ResponseEntity<List<SuggestionResponse>> getSuggestions(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        String currentUserId = jwt.getSubject();
        return ResponseEntity.ok(suggestionService.getSuggestions(currentUserId, page, size));
    }

    /** Danh sách followers của userId */
    @GetMapping("/followers/{userId}")
    public ResponseEntity<List<UserProfileResponse>> getFollowers(
            @PathVariable String userId, @AuthenticationPrincipal Jwt jwt) {

        String currentUserId = jwt != null ? jwt.getSubject() : null;
        checkPrivacy(userId, currentUserId);
        List<String> ids = followService.getFollowerIds(userId);
        if (ids.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(userClient.getUsersBatch(ids));
    }

    /** Danh sách following của userId */
    @GetMapping("/following/{userId}")
    public ResponseEntity<List<UserProfileResponse>> getFollowing(
            @PathVariable String userId, @AuthenticationPrincipal Jwt jwt) {

        String currentUserId = jwt != null ? jwt.getSubject() : null;
        checkPrivacy(userId, currentUserId);
        List<String> ids = followService.getFollowingIds(userId);
        if (ids.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(userClient.getUsersBatch(ids));
    }

    /** Danh sách bạn bè — chỉ chính chủ */
    @GetMapping("/friends/{userId}")
    public ResponseEntity<List<UserProfileResponse>> getFriends(
            @PathVariable String userId, @AuthenticationPrincipal Jwt jwt) {

        String currentUserId = jwt != null ? jwt.getSubject() : null;
        if (!userId.equals(currentUserId)) {
            throw new PrivacyException("This list is hidden due to this user's privacy settings.");
        }
        List<String> ids = followService.getFriendIds(userId);
        if (ids.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(userClient.getUsersBatch(ids));
    }

    /** Check privacy — throw nếu không có quyền */
    private void checkPrivacy(String targetUserId, String currentUserId) {
        if (targetUserId.equals(currentUserId)) return;

        UserProfileResponse profile = userClient.getUserById(targetUserId);
        if (profile == null) return;

        String privacy = profile.getConnectionsPrivacy();
        if (privacy == null || "EVERYONE".equals(privacy)) return;

        if ("ONLY_ME".equals(privacy)) {
            throw new PrivacyException("This list is hidden due to this user's privacy settings.");
        }
        if ("FRIENDS_ONLY".equals(privacy)) {
            boolean isFriend = currentUserId != null
                    && followService.isFollowing(currentUserId, targetUserId)
                    && followService.isFollowing(targetUserId, currentUserId);
            if (!isFriend) {
                throw new PrivacyException("This list is hidden due to this user's privacy settings.");
            }
        }
    }
}
