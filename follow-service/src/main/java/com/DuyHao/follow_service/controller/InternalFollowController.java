package com.DuyHao.follow_service.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.DuyHao.follow_service.service.FollowService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/internal/follow")
@RequiredArgsConstructor
public class InternalFollowController {

    private final FollowService followService;

    // Lấy danh sách mà userId đang follow
    @GetMapping("/following/{userId}")
    public List<String> getFollowingIds(@PathVariable String userId) {
        return followService.getFollowingIds(userId);
    }

    @GetMapping("/is-following")
    public boolean isFollowing(@RequestParam String followerId, @RequestParam String followingId) {
        return followService.isFollowing(followerId, followingId);
    }

    @DeleteMapping("/remove-relation")
    public void removeRelation(@RequestParam String userId1, @RequestParam String userId2) {
        followService.unfollowInternal(userId1, userId2);
        followService.unfollowInternal(userId2, userId1);
    }
}
