package com.DuyHao.group_service.controller;

import com.DuyHao.group_service.dto.ApiResponse;
import com.DuyHao.group_service.dto.request.GroupCreateRequest;
import com.DuyHao.group_service.dto.response.GroupMemberResponse;
import com.DuyHao.group_service.dto.response.GroupResponse;
import com.DuyHao.group_service.dto.request.GroupRuleUpdateRequest;
import com.DuyHao.group_service.dto.request.GroupReportRequest;
import com.DuyHao.group_service.dto.response.GroupReportResponse;
import com.DuyHao.group_service.dto.response.GroupRuleDto;
import com.DuyHao.group_service.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @PostMapping
    public ApiResponse<GroupResponse> createGroup(
            @RequestBody GroupCreateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        GroupResponse response = groupService.createGroup(request, userId);
        return ApiResponse.<GroupResponse>builder().result(response).build();
    }

    @PutMapping("/{id}")
    public ApiResponse<GroupResponse> updateGroup(
            @PathVariable String id,
            @RequestBody com.DuyHao.group_service.dto.request.GroupUpdateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        GroupResponse response = groupService.updateGroup(id, request, userId);
        return ApiResponse.<GroupResponse>builder().result(response).build();
    }

    @GetMapping("/{id}")
    public ApiResponse<GroupResponse> getGroup(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt != null ? jwt.getSubject() : null;
        GroupResponse response = groupService.getGroup(id, userId);
        return ApiResponse.<GroupResponse>builder().result(response).build();
    }

    @PostMapping("/{id}/join")
    public ApiResponse<Void> joinGroup(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        groupService.joinGroup(id, userId);
        return ApiResponse.<Void>builder().message("Request submitted").build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> disbandGroup(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        groupService.disbandGroup(id, currentUserId);
        return ApiResponse.<Void>builder().message("Group disbanded").build();
    }

    @DeleteMapping("/{id}/leave")
    public ApiResponse<Void> leaveGroup(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        groupService.leaveGroup(id, userId);
        return ApiResponse.<Void>builder().message("Left group / Withdrawn request").build();
    }

    @PutMapping("/{id}/members/{userId}/approve")
    public ApiResponse<Void> approveMember(
            @PathVariable String id,
            @PathVariable String userId,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        groupService.approveMember(id, userId, currentUserId);
        return ApiResponse.<Void>builder().message("Member approved").build();
    }
    @GetMapping("/{id}/members/active")
    public ApiResponse<java.util.List<com.DuyHao.group_service.dto.response.GroupMemberResponse>> getActiveMembers(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        java.util.List<com.DuyHao.group_service.dto.response.GroupMemberResponse> members = groupService.getActiveMembers(id, currentUserId);
        return ApiResponse.<java.util.List<com.DuyHao.group_service.dto.response.GroupMemberResponse>>builder().result(members).build();
    }

    @DeleteMapping("/{id}/members/{userId}/kick")
    public ApiResponse<Void> kickMember(
            @PathVariable String id,
            @PathVariable String userId,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        groupService.kickMember(id, userId, currentUserId);
        return ApiResponse.<Void>builder().message("Member kicked").build();
    }

    @PutMapping("/{id}/members/{userId}/promote")
    public ApiResponse<Void> promoteToModerator(
            @PathVariable String id,
            @PathVariable String userId,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        groupService.promoteToModerator(id, userId, currentUserId);
        return ApiResponse.<Void>builder().message("Promoted to Moderator").build();
    }

    @GetMapping("/{id}/members/pending")
    public ApiResponse<java.util.List<String>> getPendingMembers(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        java.util.List<String> pendingIds = groupService.getPendingMembers(id, currentUserId);
        return ApiResponse.<java.util.List<String>>builder().result(pendingIds).build();
    }
    @GetMapping("/my-groups")
    public ApiResponse<java.util.List<GroupResponse>> getMyGroups(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        java.util.List<GroupResponse> responses = groupService.getMyGroups(userId);
        return ApiResponse.<java.util.List<GroupResponse>>builder().result(responses).build();
    }

    @GetMapping
    public ApiResponse<java.util.List<GroupResponse>> getAllGroups() {
        java.util.List<GroupResponse> response = groupService.getAllGroups();
        return ApiResponse.<java.util.List<GroupResponse>>builder().result(response).build();
    }

    @GetMapping("/{id}/rules")
    public ApiResponse<List<GroupRuleDto>> getGroupRules(@PathVariable String id) {
        List<GroupRuleDto> response = groupService.getGroupRules(id);
        return ApiResponse.<List<GroupRuleDto>>builder().result(response).build();
    }

    @PutMapping("/{id}/rules")
    public ApiResponse<List<GroupRuleDto>> updateGroupRules(
            @PathVariable String id,
            @RequestBody GroupRuleUpdateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        List<GroupRuleDto> response = groupService.updateGroupRules(id, request, userId);
        return ApiResponse.<List<GroupRuleDto>>builder().result(response).build();
    }

    @PostMapping("/{id}/members/{userId}/ban")
    public ApiResponse<Void> banMember(
            @PathVariable String id,
            @PathVariable String userId,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        groupService.banMember(id, userId, currentUserId);
        return ApiResponse.<Void>builder().message("Member banned").build();
    }

    @PostMapping("/{id}/members/{userId}/unban")
    public ApiResponse<Void> unbanMember(
            @PathVariable String id,
            @PathVariable String userId,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        groupService.unbanMember(id, userId, currentUserId);
        return ApiResponse.<Void>builder().message("Member unbanned").build();
    }

    @GetMapping("/{id}/members/banned")
    public ApiResponse<java.util.List<GroupMemberResponse>> getBannedMembers(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        java.util.List<GroupMemberResponse> bannedMembers = groupService.getBannedMembers(id, currentUserId);
        return ApiResponse.<java.util.List<GroupMemberResponse>>builder().result(bannedMembers).build();
    }

    @PostMapping("/{id}/reports")
    public ApiResponse<GroupReportResponse> createReport(
            @PathVariable String id,
            @RequestBody GroupReportRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        GroupReportResponse response = groupService.createReport(id, request, currentUserId);
        return ApiResponse.<GroupReportResponse>builder().result(response).build();
    }

    @GetMapping("/{id}/reports/pending")
    public ApiResponse<List<GroupReportResponse>> getPendingReports(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        List<GroupReportResponse> response = groupService.getPendingReports(id, currentUserId);
        return ApiResponse.<List<GroupReportResponse>>builder().result(response).build();
    }

    @PutMapping("/{id}/reports/{reportId}/status")
    public ApiResponse<Void> updateReportStatus(
            @PathVariable String id,
            @PathVariable String reportId,
            @RequestParam String status,
            @RequestParam(required = false) String notifyUserId,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal Jwt jwt) {
        String currentUserId = jwt.getSubject();
        if (notifyUserId != null) {
            groupService.updateReportStatusWithNotify(id, reportId, status, currentUserId, notifyUserId, reason);
        } else {
            groupService.updateReportStatus(id, reportId, status, currentUserId);
        }
        return ApiResponse.<Void>builder().message("Report status updated to " + status).build();
    }
}
