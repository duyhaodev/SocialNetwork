package com.DuyHao.follow_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "notification-service", url = "http://localhost:8082")
public interface NotificationClient {

    @PostMapping("/internal/notifications/follow")
    void createFollowNotification(
            @RequestParam String receiverId,
            @RequestParam String senderId
    );
}