package com.DuyHao.post_service.controller;

import com.DuyHao.post_service.dto.ApiResponse;
import com.DuyHao.post_service.dto.request.PostCreateRequest;
import com.DuyHao.post_service.dto.request.TranslateRequest;
import com.DuyHao.post_service.dto.response.LocalFeedResponse;
import com.DuyHao.post_service.dto.response.PostResponse;
import com.DuyHao.post_service.dto.response.TranslateResponse;
import com.DuyHao.post_service.service.PostService;
import com.DuyHao.post_service.service.TranslateService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final TranslateService translateService;

    // ==================== CREATE POST ====================
    @PostMapping("/posts")
    public ApiResponse<PostResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody PostCreateRequest request,
            @RequestHeader(value = "X-Client-IP", required = false) String xClientIp,
            @RequestHeader(value = "X-Forwarded-For", required = false) String xForwardedFor,
            jakarta.servlet.http.HttpServletRequest httpRequest) {

        String userId = jwt.getSubject();
        // Lấy IP thật: ưu tiên X-Client-IP (Gateway inject), fallback X-Forwarded-For, rồi remoteAddr
        String clientIp = postService.extractClientIp(xClientIp, xForwardedFor, httpRequest.getRemoteAddr());
        PostResponse post = postService.create(
                userId,
                request.getContent(),
                request.getRepostOfId(),
                request.getMediaIds(),
                request.getTags(),
                clientIp,
                request.getIsAiGenerated());

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

    @GetMapping("/feed/recommended")
    public ApiResponse<List<PostResponse>> recommendedFeed(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String userId = jwt.getSubject();
        List<PostResponse> feed = postService.getRecommendedFeed(userId, page, size);
        return ApiResponse.<List<PostResponse>>builder().result(feed).build();
    }

    // ==================== LOCAL FEED ====================
    @GetMapping("/feed/local")
    public ApiResponse<LocalFeedResponse> localFeed(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String city,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String userId = jwt.getSubject();
        PostService.LocalFeedResult result = postService.getLocalFeed(city, userId, page, size);
        return ApiResponse.<LocalFeedResponse>builder()
                .result(new LocalFeedResponse(result.posts(), result.isFallback(), city))
                .build();
    }

    // Dịch IP của client thành tên tỉnh/thành phố
    @GetMapping("/feed/resolve-city")
    public ApiResponse<String> resolveCity(
            @RequestHeader(value = "X-Client-IP", required = false) String xClientIp,
            @RequestHeader(value = "X-Forwarded-For", required = false) String xForwardedFor,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        // Lấy IP thật: ưu tiên X-Client-IP (Gateway inject), fallback X-Forwarded-For, rồi remoteAddr
        String clientIp = postService.extractClientIp(xClientIp, xForwardedFor, httpRequest.getRemoteAddr());
        String city = postService.resolveCity(clientIp);
        return ApiResponse.<String>builder().result(city).build();
    }

    @GetMapping("/feed/trending-tags")
    public ApiResponse<List<String>> getTrendingTags(@RequestParam(defaultValue = "3") int limit) {
        return ApiResponse.<List<String>>builder()
                .result(postService.getTrendingTags(limit))
                .build();
    }

    @GetMapping("/feed/tag/{tag}")
    public ApiResponse<List<PostResponse>> getPostsByTag(
            @PathVariable String tag,
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String userId = jwt.getSubject();
        return ApiResponse.<List<PostResponse>>builder()
                .result(postService.getPostsByTag(tag, userId, page, size))
                .build();
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

    // ==================== TRANSLATE ====================
    @PostMapping("/posts/translate")
    public ApiResponse<TranslateResponse> translate(
            @RequestBody TranslateRequest request, @AuthenticationPrincipal Jwt jwt) {
        TranslateResponse result = translateService.translate(request);
        return ApiResponse.<TranslateResponse>builder().result(result).build();
    }
}
