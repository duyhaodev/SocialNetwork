package com.DuyHao.post_service.FeignClient;

import com.DuyHao.post_service.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "group-service", url = "${app.service.group}")
public interface GroupClient {

    @GetMapping("/internal/{id}/check-member")
    boolean checkMember(@PathVariable("id") String id, @RequestParam("userId") String userId);

    // Define a basic class to receive group info
    record GroupInfo(String id, String privacy, Boolean requiresApproval, String name) {}

    @GetMapping("/{id}")
    ApiResponse<GroupInfo> getGroup(@PathVariable("id") String id);

    @GetMapping("/internal/{id}/member-role")
    String getMemberRole(@PathVariable("id") String id, @RequestParam("userId") String userId);

    @GetMapping("/internal/users/{userId}/groups")
    java.util.Map<String, String> getUserGroupMap(@PathVariable("userId") String userId);
}
