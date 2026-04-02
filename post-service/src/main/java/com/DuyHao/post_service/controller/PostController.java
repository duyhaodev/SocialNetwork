package com.DuyHao.post_service.controller;

import com.DuyHao.post_service.dto.request.PostCreateRequest;
import com.DuyHao.post_service.dto.response.PostResponse;
import com.DuyHao.post_service.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    // ==================== CREATE POST ====================
    @PostMapping("/posts")
    public ResponseEntity<PostResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody PostCreateRequest request
    ) {
        String userId = jwt.getSubject();
        PostResponse post = postService.create(
                userId,
                request.getContent(),
                request.getRepostOfId(),
                request.getMediaIds()
        );

        return ResponseEntity.ok(post);
    }

    // ==================== DELETE POST ====================
    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<Void> deletePost(
            @PathVariable String postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        postService.deletePost(userId, postId);
        return ResponseEntity.noContent().build();
    }

    // ==================== FEED ====================
    @GetMapping("/feed")
    public ResponseEntity<List<PostResponse>> feed(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        String userId = jwt.getSubject();
        List<PostResponse> feed = postService.getFeed(userId, page, size);
        return ResponseEntity.ok(feed);
    }

    // ==================== PROFILE ====================
    @GetMapping("/profile")
    public ResponseEntity<List<PostResponse>> getMyProfilePosts(
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        List<PostResponse> posts = postService.getPostsByUserId(userId, userId);
        return ResponseEntity.ok(posts);
    }

    @GetMapping("/profile/reposts")
    public ResponseEntity<List<PostResponse>> getMyReposts(
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        List<PostResponse> reposts = postService.getRepostsByUserId(userId, userId);
        return ResponseEntity.ok(reposts);
    }

    @GetMapping("/profile/{username}")
    public ResponseEntity<List<PostResponse>> getUserProfilePosts(
            @PathVariable String username,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        List<PostResponse> posts = postService.getPostsByUsername(username, userId);
        return ResponseEntity.ok(posts);
    }

    @GetMapping("/profile/{username}/reposts")
    public ResponseEntity<List<PostResponse>> getUserReposts(
            @PathVariable String username,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        List<PostResponse> reposts = postService.getRepostsByUsername(username, userId);
        return ResponseEntity.ok(reposts);
    }

    // ==================== GET ONE POST ====================
    @GetMapping("/posts/{postId}")
    public ResponseEntity<PostResponse> getOne(
            @PathVariable String postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        PostResponse post = postService.getPostById(postId, userId);
        return ResponseEntity.ok(post);
    }

    // ==================== REPOST ====================
    @PostMapping("/posts/{postId}/repost")
    public ResponseEntity<PostResponse> repost(
            @PathVariable String postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        PostResponse repost = postService.repost(userId, postId);
        return ResponseEntity.ok(repost);
    }

    @DeleteMapping("/posts/{postId}/repost")
    public ResponseEntity<Map<String, String>> unrepost(
            @PathVariable String postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        String repostId = postService.unrepost(userId, postId);
        return ResponseEntity.ok(Map.of("repostId", repostId));
    }
}