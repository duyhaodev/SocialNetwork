package com.DuyHao.follow_service.client;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.DuyHao.follow_service.dto.UserProfileResponse;

@FeignClient(name = "user-service", url = "${app.service.profile}")
public interface UserClient {

    @PostMapping("/internal/users/{id}/followers/increment")
    void incrementFollowers(@PathVariable String id);

    @PostMapping("/internal/users/{id}/followers/decrement")
    void decrementFollowers(@PathVariable String id);

    @PostMapping("/internal/users/{id}/following/increment")
    void incrementFollowing(@PathVariable String id);

    @PostMapping("/internal/users/{id}/following/decrement")
    void decrementFollowing(@PathVariable String id);

    // Lấy thông tin nhiều user cùng lúc
    @PostMapping("/internal/users/batch")
    List<UserProfileResponse> getUsersBatch(List<String> userIds);

    // Lấy thông tin 1 user theo userId
    @GetMapping("/internal/users/id/{userId}")
    UserProfileResponse getUserById(@PathVariable String userId);

    // Lấy top N user có follower cao nhất
    @GetMapping("/internal/users/top-followers")
    List<UserProfileResponse> getTopFollowers(@RequestParam int limit);
}
