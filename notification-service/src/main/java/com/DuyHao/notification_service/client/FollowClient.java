package com.DuyHao.notification_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "follow-service", url = "http://localhost:8082")
public interface FollowClient {

    @GetMapping("/internal/follow/check")
    boolean isFollowing(
            @RequestParam String followerId,
            @RequestParam String followingId
    );
}