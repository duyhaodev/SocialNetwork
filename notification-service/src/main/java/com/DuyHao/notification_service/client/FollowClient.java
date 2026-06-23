package com.DuyHao.notification_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "follow-service", url = "${app.service.follow}")
public interface FollowClient {

    @GetMapping("/internal/follow/is-following")
    boolean isFollowing(@RequestParam String followerId, @RequestParam String followingId);
}
