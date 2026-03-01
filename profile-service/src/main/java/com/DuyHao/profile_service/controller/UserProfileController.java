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

    @GetMapping("/users/{profileId}")
    UserProfileResponse getProfile(@PathVariable String profileId) {
        return userProfileRepositoryService.getProfile(profileId);
    }

    @GetMapping("/users")
    ApiResponse<List<UserProfileResponse>> getAllProfiles() {
        return ApiResponse.<List<UserProfileResponse>>builder()
                .result(userProfileRepositoryService.getAllProfiles())
                .build();
    }
}
