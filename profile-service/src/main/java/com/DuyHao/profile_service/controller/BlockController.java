package com.DuyHao.profile_service.controller;

import com.DuyHao.profile_service.dto.response.ApiResponse;
import com.DuyHao.profile_service.dto.response.UserProfileResponse;
import com.DuyHao.profile_service.service.UserProfileRepositoryService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users/block")
@RequiredArgsConstructor
public class BlockController {

    private final UserProfileRepositoryService userProfileRepositoryService;

    @PostMapping("/{targetId}")
    public ApiResponse<String> blockUser(@PathVariable String targetId) {
        String currentUserId =
                SecurityContextHolder.getContext().getAuthentication().getName();
        userProfileRepositoryService.blockUser(currentUserId, targetId);
        return ApiResponse.<String>builder().result("Blocked successfully").build();
    }

    @DeleteMapping("/{targetId}")
    public ApiResponse<String> unblockUser(@PathVariable String targetId) {
        String currentUserId =
                SecurityContextHolder.getContext().getAuthentication().getName();
        userProfileRepositoryService.unblockUser(currentUserId, targetId);
        return ApiResponse.<String>builder().result("Unblocked successfully").build();
    }

    @GetMapping
    public ApiResponse<List<UserProfileResponse>> getBlockedUsers() {
        String currentUserId =
                SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.<List<UserProfileResponse>>builder()
                .result(userProfileRepositoryService.getBlockedUsers(currentUserId))
                .build();
    }
}
