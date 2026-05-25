package com.DuyHao.story_service.client;

import com.DuyHao.story_service.dto.response.UserProfileResponse;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

// Gọi sang profile-service để lấy thông tin user
@FeignClient(name = "profile-service", url = "${app.service.profile}")
public interface ProfileClient {

    // Lấy 1 user theo userId
    @GetMapping("/internal/users/id/{userId}")
    UserProfileResponse getUserById(@PathVariable String userId);

    // Lấy nhiều user cùng lúc (dùng cho feed stories)
    @PostMapping("/internal/users/batch")
    List<UserProfileResponse> getUsersBatch(@RequestBody List<String> userIds);
}
