package com.DuyHao.story_service.client;

import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "follow-service", url = "${app.service.follow}")
public interface FollowClient {

    // Lấy danh sách mà currentUser đang follow
    @GetMapping("/internal/follow/following/{userId}")
    List<String> getFollowingIds(@PathVariable String userId);

    // Kiểm tra followerId có follow không
    @GetMapping("/internal/follow/is-following")
    boolean isFollowing(
            @RequestParam String followerId,
            @RequestParam String followingId);
}
