package com.DuyHao.story_service.controller;

import com.DuyHao.story_service.dto.ApiResponse;
import com.DuyHao.story_service.dto.request.StoryCreateRequest;
import com.DuyHao.story_service.dto.response.StoryResponse;
import com.DuyHao.story_service.dto.response.StoryViewResponse;
import com.DuyHao.story_service.service.StoryService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    // ==================== TẠO STORY ====================
    @PostMapping("/stories")
    public ApiResponse<StoryResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody StoryCreateRequest request) {
        String userId = jwt.getSubject();
        return ApiResponse.<StoryResponse>builder()
                .result(storyService.createStory(userId, request))
                .build();
    }

    // ==================== XÓA STORY ====================
    @DeleteMapping("/stories/{storyId}")
    public ApiResponse<Void> delete(
            @PathVariable String storyId,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        storyService.deleteStory(userId, storyId);
        return ApiResponse.<Void>builder()
                .message("Story deleted successfully")
                .build();
    }

    // ==================== FEED ====================
    @GetMapping("/stories/feed")
    public ApiResponse<List<StoryResponse>> getFeed(
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        return ApiResponse.<List<StoryResponse>>builder()
                .result(storyService.getFeedStories(userId))
                .build();
    }

    // ==================== STORY CỦA MÌNH ====================
    @GetMapping("/stories/mine")
    public ApiResponse<List<StoryResponse>> getMyStories(
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        return ApiResponse.<List<StoryResponse>>builder()
                .result(storyService.getMyStories(userId))
                .build();
    }

    // ==================== KHO LƯU TRỮ (phân trang) ====================
    @GetMapping("/stories/archive")
    public ApiResponse<List<StoryResponse>> getArchive(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String userId = jwt.getSubject();
        return ApiResponse.<List<StoryResponse>>builder()
                .result(storyService.getArchive(userId, page, size))
                .build();
    }

    // ==================== XEM STORY CỦA USER KHÁC ====================
    @GetMapping("/stories/user/{userId}")
    public ApiResponse<List<StoryResponse>> getUserStories(
            @PathVariable String userId,
            @AuthenticationPrincipal Jwt jwt) {
        String viewerId = jwt.getSubject();
        return ApiResponse.<List<StoryResponse>>builder()
                .result(storyService.getUserStories(userId, viewerId))
                .build();
    }

    // ==================== ĐÁNH DẤU ĐÃ XEM ====================
    @PostMapping("/stories/{storyId}/view")
    public ApiResponse<Void> markViewed(
            @PathVariable String storyId,
            @AuthenticationPrincipal Jwt jwt) {
        String viewerId = jwt.getSubject();
        storyService.markViewed(storyId, viewerId);
        return ApiResponse.<Void>builder()
                .message("Marked as viewed")
                .build();
    }

    // ==================== XEM AI ĐÃ XEM (chỉ owner) ====================
    @GetMapping("/stories/{storyId}/views")
    public ApiResponse<List<StoryViewResponse>> getViewers(
            @PathVariable String storyId,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        return ApiResponse.<List<StoryViewResponse>>builder()
                .result(storyService.getViewers(storyId, userId))
                .build();
    }
}
