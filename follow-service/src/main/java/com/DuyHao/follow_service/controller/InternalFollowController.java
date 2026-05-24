package com.DuyHao.follow_service.controller;

import org.springframework.web.bind.annotation.*;

import com.DuyHao.follow_service.service.FollowService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/internal/follow")
@RequiredArgsConstructor
public class InternalFollowController {

    private final FollowService followService;

    @GetMapping("/check")
    public boolean isFollowing(@RequestParam String followerId, @RequestParam String followingId) {
        return followService.isFollowing(followerId, followingId);
    }
}
