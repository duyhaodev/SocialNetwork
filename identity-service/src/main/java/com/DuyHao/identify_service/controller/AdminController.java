package com.DuyHao.identify_service.controller;

import com.DuyHao.identify_service.dto.request.ApiResponse;
import com.DuyHao.identify_service.dto.response.UserResponse;
import com.DuyHao.identify_service.service.UserService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminController {
    UserService userService;

    @GetMapping
    ApiResponse<Page<UserResponse>> getAllUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.<Page<UserResponse>>builder()
                .result(userService.getAllUsers(keyword, PageRequest.of(page, size)))
                .build();
    }

    @PutMapping("/{userId}/ban")
    ApiResponse<String> banUser(@PathVariable String userId) {
        userService.banUser(userId);
        return ApiResponse.<String>builder()
                .result("User has been banned")
                .build();
    }

    @PutMapping("/{userId}/unban")
    ApiResponse<String> unbanUser(@PathVariable String userId) {
        userService.unbanUser(userId);
        return ApiResponse.<String>builder()
                .result("User has been unbanned")
                .build();
    }

    @GetMapping("/stats")
    ApiResponse<Long> getUserStats() {
        return ApiResponse.<Long>builder()
                .result(userService.getUserCount())
                .build();
    }
}
