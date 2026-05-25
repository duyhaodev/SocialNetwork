package com.DuyHao.profile_service.controller;

import com.DuyHao.profile_service.dto.request.ProfileCreationRequest;
import com.DuyHao.profile_service.dto.response.UserProfileResponse;
import com.DuyHao.profile_service.service.UserProfileRepositoryService;
import java.util.List;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestParam;

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

    @GetMapping("/internal/users/search")
    public List<UserProfileResponse> searchUsers(@RequestParam("keyword") String keyword) {
        var profiles = userProfileRepositoryService.searchUsersInternal(keyword);
        return profiles;
    }
    // Tăng số lượng người theo dõi (Followers)
    @PostMapping("/internal/users/{id}/followers/increment")
    public void incrementFollowers(@PathVariable("id") String id) {
        userProfileRepositoryService.updateFollowerCount(id, 1);
    }
    // Giảm số lượng người theo dõi (Followers)
    @PostMapping("/internal/users/{id}/followers/decrement")
    public void decrementFollowers(@PathVariable("id") String id) {
        userProfileRepositoryService.updateFollowerCount(id, -1);
    }
    // Tăng số lượng người đang theo dõi (Following)
    @PostMapping("/internal/users/{id}/following/increment")
    public void incrementFollowing(@PathVariable("id") String id) {
        userProfileRepositoryService.updateFollowingCount(id, 1);
    }
    // Giảm số lượng người đang theo dõi (Following)
    @PostMapping("/internal/users/{id}/following/decrement")
    public void decrementFollowing(@PathVariable("id") String id) {
        userProfileRepositoryService.updateFollowingCount(id, -1);
    }

    // Lấy top N user có follower cao nhất
    @GetMapping("/internal/users/top-followers")
    public List<UserProfileResponse> getTopFollowers(@RequestParam int limit) {
        return userProfileRepositoryService.getTopFollowers(limit);
    }

    @GetMapping("/internal/users/{id}/preferences")
    public java.util.Map<String, Double> getUserPreferences(@PathVariable("id") String id) {
        return userProfileRepositoryService.getUserPreferences(id);
    }
}
