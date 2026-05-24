package com.DuyHao.notification_service.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.DuyHao.notification_service.service.NotificationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/internal/notifications")
@RequiredArgsConstructor
public class InternalNotificationController {

    private final NotificationService notificationService;

    // ===== FOLLOW =====
    @PostMapping("/follow")
    public ResponseEntity<?> follow(@RequestParam String receiverId, @RequestParam String senderId) {
        notificationService.createFollowNotification(receiverId, senderId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/follow")
    public ResponseEntity<?> unfollow(@RequestParam String receiverId, @RequestParam String senderId) {
        notificationService.deleteFollowNotification(receiverId, senderId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/follow/resolve")
    public ResponseEntity<?> resolveFollow(@RequestParam String receiverId, @RequestParam String senderId) {
        notificationService.markFollowResolved(receiverId, senderId);
        return ResponseEntity.ok().build();
    }

    // ===== LIKE POST =====
    @PostMapping("/like-post")
    public ResponseEntity<?> likePost(
            @RequestParam String receiverId, @RequestParam String senderId, @RequestParam String postId) {
        notificationService.createLikePostNotification(receiverId, senderId, postId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/like-post")
    public ResponseEntity<?> unlikePost(
            @RequestParam String receiverId, @RequestParam String senderId, @RequestParam String postId) {
        notificationService.deleteLikePostNotification(receiverId, senderId, postId);
        return ResponseEntity.ok().build();
    }

    // ===== LIKE COMMENT =====
    @PostMapping("/like-comment")
    public ResponseEntity<?> likeComment(
            @RequestParam String receiverId,
            @RequestParam String senderId,
            @RequestParam String commentId,
            @RequestParam(required = false) String postId) {
        notificationService.createLikeCommentNotification(receiverId, senderId, commentId, postId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/like-comment")
    public ResponseEntity<?> unlikeComment(
            @RequestParam String receiverId, @RequestParam String senderId, @RequestParam String commentId) {
        notificationService.deleteLikeCommentNotification(receiverId, senderId, commentId);
        return ResponseEntity.ok().build();
    }

    // ===== COMMENT =====
    @PostMapping("/comment")
    public ResponseEntity<?> comment(
            @RequestParam String receiverId,
            @RequestParam String senderId,
            @RequestParam String commentId,
            @RequestParam String postId) {
        notificationService.createCommentNotification(receiverId, senderId, commentId, postId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reply")
    public ResponseEntity<?> reply(
            @RequestParam String receiverId,
            @RequestParam String senderId,
            @RequestParam String commentId,
            @RequestParam(required = false) String postId) {
        notificationService.createReplyNotification(receiverId, senderId, commentId, postId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/comment/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable String commentId) {
        notificationService.deleteNotificationsForComment(commentId);
        return ResponseEntity.ok().build();
    }

    // ===== REPOST =====
    @PostMapping("/repost")
    public ResponseEntity<?> repost(
            @RequestParam String receiverId, @RequestParam String senderId, @RequestParam String postId) {
        notificationService.createRepostNotification(receiverId, senderId, postId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/repost")
    public ResponseEntity<?> unrepost(
            @RequestParam String receiverId, @RequestParam String senderId, @RequestParam String postId) {
        notificationService.deleteRepostNotification(receiverId, senderId, postId);
        return ResponseEntity.ok().build();
    }
}
