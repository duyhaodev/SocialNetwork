package com.DuyHao.follow_service.controller;


import com.DuyHao.follow_service.client.UserClient;
import com.DuyHao.follow_service.dto.FollowResponse;
import com.DuyHao.follow_service.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/follow")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;
    private final UserClient userClient;

    @PostMapping("/{followingId}/toggle")
    public ResponseEntity<?> toggleFollow(@PathVariable String followingId,
                                          Authentication auth) {

        String followerId = userClient.getUserIdByUsername(auth.getName());

        boolean isFollowing = followService.isFollowing(followerId, followingId);

        FollowResponse response;

        if (isFollowing)
            response = followService.unfollowUser(followerId, followingId);
        else
            response = followService.followUser(followerId, followingId);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{followingId}")
    public boolean checkFollowing(@PathVariable String followingId,
                                  Authentication auth) {

        String followerId = userClient.getUserIdByUsername(auth.getName());

        return followService.isFollowing(followerId, followingId);
    }
}