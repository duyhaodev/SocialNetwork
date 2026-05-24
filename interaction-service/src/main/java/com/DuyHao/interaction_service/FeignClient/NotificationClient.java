package com.DuyHao.interaction_service.FeignClient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "notification-service", url = "${app.service.notification}")
public interface NotificationClient {

    @PostMapping("/internal/notifications/like-post")
    void likePost(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("senderId") String senderId,
            @RequestParam("postId") String postId);

    @DeleteMapping("/internal/notifications/like-post")
    void unlikePost(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("senderId") String senderId,
            @RequestParam("postId") String postId);

    @PostMapping("/internal/notifications/like-comment")
    void likeComment(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("senderId") String senderId,
            @RequestParam("commentId") String commentId,
            @RequestParam(value = "postId", required = false) String postId);

    @DeleteMapping("/internal/notifications/like-comment")
    void unlikeComment(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("senderId") String senderId,
            @RequestParam("commentId") String commentId);

    @PostMapping("/internal/notifications/comment")
    void comment(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("senderId") String senderId,
            @RequestParam("commentId") String commentId,
            @RequestParam("postId") String postId);

    @PostMapping("/internal/notifications/reply")
    void reply(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("senderId") String senderId,
            @RequestParam("commentId") String commentId,
            @RequestParam(value = "postId", required = false) String postId);

    @DeleteMapping("/internal/notifications/comment/{commentId}")
    void deleteCommentNotifications(@PathVariable("commentId") String commentId);

    @PostMapping("/internal/notifications/repost")
    void repost(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("senderId") String senderId,
            @RequestParam("postId") String postId);

    @DeleteMapping("/internal/notifications/repost")
    void unrepost(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("senderId") String senderId,
            @RequestParam("postId") String postId);
}
