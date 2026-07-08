package com.DuyHao.follow_service.controller;

import java.util.List;

import com.DuyHao.follow_service.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class InternalFollowController {

    private final FollowService followService;

    // Lấy danh sách mà userId đang follow — dùng bởi notification-service
    @GetMapping("/internal/follow/following/{userId}")
    public List<String> getFollowingIds(@PathVariable String userId) {
        return followService.getFollowingIds(userId);
    }

    // Kiểm tra userId có follow targetId không
    @GetMapping("/internal/follow/is-following")
    public boolean isFollowing(@RequestParam String followerId, @RequestParam String followingId) {
        return followService.isFollowing(followerId, followingId);
    }

    // Xóa quan hệ follow 2 chiều — được gọi bởi profile-service khi block user
    @DeleteMapping("/internal/follows/remove-relation")
    public void removeRelation(@RequestParam String userId1, @RequestParam String userId2) {
        followService.unfollowInternal(userId1, userId2);
        followService.unfollowInternal(userId2, userId1);
    }
}
