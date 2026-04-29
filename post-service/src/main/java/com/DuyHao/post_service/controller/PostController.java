package com.DuyHao.post_service.controller;

import com.DuyHao.post_service.dto.ApiResponse;
import com.DuyHao.post_service.dto.request.PostCreateRequest;
import com.DuyHao.post_service.dto.response.PostResponse;
import com.DuyHao.post_service.service.PostService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    // ==================== CREATE POST ====================
    @PostMapping("/posts")
    public ApiResponse<PostResponse> create(@AuthenticationPrincipal Jwt jwt, @RequestBody PostCreateRequest request) {
        String userId = jwt.getSubject();
        PostResponse post =
                postService.create(userId, request.getContent(), request.getRepostOfId(), request.getMediaIds());

        return ApiResponse.<PostResponse>builder().result(post).build();
    }

    // ==================== DELETE POST ====================
    @DeleteMapping("/posts/{postId}")
    public ApiResponse<Void> deletePost(@PathVariable String postId, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        postService.deletePost(userId, postId);
        return ApiResponse.<Void>builder().message("Post deleted successfully").build();
    }

    // ==================== FEED ====================
    @GetMapping("/feed")
    public ApiResponse<List<PostResponse>> feed(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String userId = jwt.getSubject();
        List<PostResponse> feed = postService.getFeed(userId, page, size);
        return ApiResponse.<List<PostResponse>>builder().result(feed).build();
    }

    // ==================== PROFILE ====================
    @GetMapping("/posts/profile")
    public ApiResponse<List<PostResponse>> getMyProfilePosts(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        List<PostResponse> posts = postService.getPostsByUserId(userId, userId);
        return ApiResponse.<List<PostResponse>>builder().result(posts).build();
    }

    @GetMapping("/posts/profile/reposts")
    public ApiResponse<List<PostResponse>> getMyReposts(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        List<PostResponse> reposts = postService.getRepostsByUserId(userId, userId);
        return ApiResponse.<List<PostResponse>>builder().result(reposts).build();
    }

    @GetMapping("/posts/profile/{username}")
    public ApiResponse<List<PostResponse>> getUserProfilePosts(
            @PathVariable String username, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        List<PostResponse> posts = postService.getPostsByUsername(username, userId);
        return ApiResponse.<List<PostResponse>>builder().result(posts).build();
    }

    @GetMapping("/posts/profile/{username}/reposts")
    public ApiResponse<List<PostResponse>> getUserReposts(
            @PathVariable String username, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        List<PostResponse> reposts = postService.getRepostsByUsername(username, userId);
        return ApiResponse.<List<PostResponse>>builder().result(reposts).build();
    }

    // ==================== SEARCH ====================
    @GetMapping("/posts/search")
    public ApiResponse<List<PostResponse>> searchPosts(
            @RequestParam("keyword") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        List<PostResponse> posts = postService.searchPosts(keyword, userId, page, size);
        return ApiResponse.<List<PostResponse>>builder().result(posts).build();
    }

    // ==================== GET ONE POST ====================
    @GetMapping("/posts/{postId}")
    public ApiResponse<PostResponse> getOne(@PathVariable String postId, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        PostResponse post = postService.getPostById(postId, userId);
        return ApiResponse.<PostResponse>builder().result(post).build();
    }
}
