package com.DuyHao.group_service.controller;

import com.DuyHao.group_service.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class InternalGroupController {
    private final GroupService groupService;

    // INTERNAL API FOR OTHER SERVICES
    @GetMapping("/internal/{id}/check-member")
    public boolean checkMember(
            @PathVariable String id,
            @RequestParam String userId) {
        return groupService.isUserInGroup(id, userId);
    }

    @GetMapping("/internal/{id}/member-role")
    public String getMemberRole(
            @PathVariable String id,
            @RequestParam String userId) {
        return groupService.getMemberRole(id, userId);
    }

    @GetMapping("/internal/users/{userId}/groups")
    public java.util.Map<String, String> getUserGroupMap(@PathVariable String userId) {
        return groupService.getUserGroupMap(userId);
    }
}
