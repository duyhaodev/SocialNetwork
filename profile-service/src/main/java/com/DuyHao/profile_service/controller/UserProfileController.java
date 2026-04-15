package com.DuyHao.profile_service.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.DuyHao.profile_service.dto.ApiResponse;
import com.DuyHao.profile_service.dto.response.UserProfileResponse;
import com.DuyHao.profile_service.service.UserProfileRepositoryService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserProfileController {
    UserProfileRepositoryService userProfileRepositoryService;

    @GetMapping("/users/{username}")
    ApiResponse<UserProfileResponse> getProfileByUsername(@PathVariable("username") String username) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userProfileRepositoryService.getByUsername(username))
                .build();
    }

    @GetMapping("/users")
    ApiResponse<List<UserProfileResponse>> searchUsers(@RequestParam(value = "keyword", required = false) String keyword) {
        List<UserProfileResponse> result;

        if (keyword != null && !keyword.isEmpty()) {
            result = userProfileRepositoryService.searchUsers(keyword);
        } else {
            result = userProfileRepositoryService.getAllProfiles();
        }
        return ApiResponse.<List<UserProfileResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/myInfo")
    ApiResponse<UserProfileResponse> getMyInfo() {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userProfileRepositoryService.getMyInfo())
                .build();
    }
}
