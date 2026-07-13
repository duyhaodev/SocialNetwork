package com.DuyHao.post_service.FeignClient;

import com.DuyHao.post_service.configuration.FeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(
        name = "notification-service",
        url = "${app.service.notification}",
        path = "/internal/notifications",
        configuration = FeignConfig.class)
public interface NotificationClient {

    @PostMapping("/group-post-approved")
    ResponseEntity<?> groupPostApproved(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("senderId") String senderId,
            @RequestParam("postId") String postId);

    @PostMapping("/group-post-rejected")
    ResponseEntity<?> groupPostRejected(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("senderId") String senderId,
            @RequestParam("postId") String postId,
            @RequestParam(value = "reason", required = false) String reason);

    @PostMapping("/post-hidden-admin")
    ResponseEntity<?> postHiddenByAdmin(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("postId") String postId,
            @RequestParam("reason") String reason);

    @RequestMapping(method = RequestMethod.DELETE, value = "/post-hidden-admin")
    ResponseEntity<?> deletePostHiddenNotification(
            @RequestParam("receiverId") String receiverId, @RequestParam("postId") String postId);
}
