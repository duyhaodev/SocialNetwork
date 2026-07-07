package com.DuyHao.follow_service.controller;

import com.DuyHao.follow_service.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/follows")
@RequiredArgsConstructor
public class InternalFollowController {

    private final FollowService followService;

    /**
     * Xóa quan hệ follow 2 chiều — block user.
     */
    @DeleteMapping("/remove-relation")
    public void removeRelation(@RequestParam String userId1, @RequestParam String userId2) {
        followService.unfollowInternal(userId1, userId2);
        followService.unfollowInternal(userId2, userId1);
    }
}
