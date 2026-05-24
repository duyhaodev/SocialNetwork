package com.DuyHao.follow_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "notification-service", url = "http://localhost:8082")
public interface NotificationClient {

    @PostMapping("/notification/internal/notifications/follow")
    void createFollowNotification(@RequestParam String receiverId, @RequestParam String senderId);

    @DeleteMapping("/notification/internal/notifications/follow")
    void deleteFollowNotification(@RequestParam String receiverId, @RequestParam String senderId);

    @PostMapping("/notification/internal/notifications/follow/resolve")
    void resolveFollowNotification(@RequestParam String receiverId, @RequestParam String senderId);
}
