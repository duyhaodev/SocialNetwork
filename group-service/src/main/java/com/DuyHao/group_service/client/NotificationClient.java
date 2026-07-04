package com.DuyHao.group_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.DuyHao.group_service.configuration.FeignConfig;

@FeignClient(name = "notification-service", url = "${app.service.notification}", path = "/internal/notifications", configuration = FeignConfig.class)
public interface NotificationClient {

    @PostMapping("/group-join-request")
    ResponseEntity<?> groupJoinRequest(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("senderId") String senderId,
            @RequestParam("groupId") String groupId);

    @PostMapping("/group-join-approved")
    ResponseEntity<?> groupJoinApproved(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("senderId") String senderId,
            @RequestParam("groupId") String groupId);

    @PostMapping("/group-post-report-deleted")
    ResponseEntity<?> groupPostReportDeleted(
            @RequestParam("receiverId") String receiverId,
            @RequestParam("senderId") String senderId,
            @RequestParam("groupId") String groupId,
            @RequestParam(value = "reason", required = false) String reason);
}
