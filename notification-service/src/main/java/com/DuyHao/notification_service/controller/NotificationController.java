package com.DuyHao.notification_service.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.DuyHao.notification_service.service.NotificationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/{userId}")
    public ResponseEntity<?> getActivities(
            @PathVariable String userId,
            @RequestParam(required = false) List<String> type,
            @RequestParam(defaultValue = "10") int limit) {

        return ResponseEntity.ok(Map.of(
                "activities",
                notificationService.getGroupedActivities(userId, type, limit),
                "unreadCount",
                notificationService.getUnreadCount(userId)));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable String notificationId) {

        notificationService.markAsRead(notificationId);

        return ResponseEntity.ok().build();
    }
}
