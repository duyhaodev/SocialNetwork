package com.DuyHao.profile_service.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.DuyHao.profile_service.dto.request.ProfileCreationRequest;
import com.DuyHao.profile_service.dto.response.UserProfileResponse;
import com.DuyHao.profile_service.service.UserProfileRepositoryService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InternalUserProfileController {
    UserProfileRepositoryService userProfileRepositoryService;

    @PostMapping("/internal/users")
    UserProfileResponse createProfile(@RequestBody ProfileCreationRequest request) {
        return userProfileRepositoryService.createProfile(request);
    }

    @GetMapping("/internal/users/id/{profileId}")
    UserProfileResponse getProfile(@PathVariable String profileId) {
        return userProfileRepositoryService.getProfile(profileId);
    }

    @GetMapping("/internal/users/{username}")
    UserProfileResponse getProfileByUsername(@PathVariable String username) {
        return userProfileRepositoryService.getByUsername(username);
    }

    // Lấy thông tin nhiều người dùng cùng lúc
    @PostMapping("/internal/users/batch")
    public List<UserProfileResponse> getUsers(@RequestBody List<String> userIds) {
        return userProfileRepositoryService.getUsers(userIds);
    }
}
