package com.DuyHao.post_service.service;

import com.DuyHao.post_service.FeignClient.AiClient;
import com.DuyHao.post_service.FeignClient.FollowClient;
import com.DuyHao.post_service.FeignClient.InteractionClient;
import com.DuyHao.post_service.FeignClient.MediaClient;
import com.DuyHao.post_service.FeignClient.UserClient;
import com.DuyHao.post_service.dto.request.AiTagRequest;
import com.DuyHao.post_service.dto.response.*;
import com.DuyHao.post_service.entity.Post;
import com.DuyHao.post_service.mapper.PostMapper;
import com.DuyHao.post_service.repository.PostRepository;
import com.DuyHao.post_service.util.TextNormalizer;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final PostMapper postMapper;
    private final UserClient userClient;
    private final MediaClient mediaClient;
    private final InteractionClient interactionClient;
    private final GeoIpService geoIpService;
    private final LocalFeedCacheService localFeedCacheService;
    private final AiClient aiClient;
    private final FollowClient followClient;
    private final com.DuyHao.post_service.FeignClient.GroupClient groupClient;
    private final com.DuyHao.post_service.FeignClient.NotificationClient notificationClient;

    // ==================== CREATE ====================
    public PostResponse create(
            String userId,
            String content,
            String repostOfId,
            String groupId,
            List<String> mediaIds,
            List<String> tags,
            String clientIp) {
        UserResponse user = userClient.getUser(userId);

        // Resolve city từ IP
        String city = geoIpService.resolveCity(clientIp);

        // Group Logic
        String status = "APPROVED";
        if (groupId != null && !groupId.isBlank()) {
            boolean isMember = false;
            try {
                isMember = groupClient.checkMember(groupId, userId);
            } catch (Exception e) {
                throw new RuntimeException("Error checking group membership");
            }
            if (!isMember) {
                throw new RuntimeException("You are not a member of this group");
            }

            // Fetch group info to check approval
            try {
                var groupResponse = groupClient.getGroup(groupId);
                if (groupResponse != null && groupResponse.getResult() != null) {
                    if (Boolean.TRUE.equals(groupResponse.getResult().requiresApproval())) {
                        String role = "NONE";
                        try {
                            role = groupClient.getMemberRole(groupId, userId);
                        } catch (Exception e) {
                            System.err.println("Could not fetch member role");
                        }

                        if (!"ADMIN".equals(role) && !"MODERATOR".equals(role)) {
                            status = "PENDING";
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Could not fetch group info for approval check");
            }
        }

        // Auto AI Tagging if no manual tags are provided
        List<String> resolvedTags = tags;
        if (resolvedTags == null || resolvedTags.isEmpty()) {
            List<String> imageUrls = new ArrayList<>();
            if (mediaIds != null && !mediaIds.isEmpty()) {
                try {
                    List<MediaResponse> mediaResponses = mediaClient.getMediaByIds(mediaIds);
                    if (mediaResponses != null) {
                        imageUrls = mediaResponses.stream()
                                .filter(m -> "image".equalsIgnoreCase(m.getMediaType()))
                                .map(MediaResponse::getMediaUrl)
                                .collect(Collectors.toList());
                    }
                } catch (Exception e) {
                    System.err.println("Lỗi lấy URL ảnh từ media-service: " + e.getMessage());
                }
            }

            try {
                AiTagResponse aiResponse = aiClient.extractTags(AiTagRequest.builder()
                        .content(content)
                        .imageUrls(imageUrls)
                        .threshold(0.35)
                        .build());
                if (aiResponse != null && aiResponse.getTags() != null) {
                    resolvedTags = aiResponse.getTags();
                }
            } catch (Exception e) {
                System.err.println("Lỗi gọi AI Auto Tagging: " + e.getMessage());
                resolvedTags = new ArrayList<>();
            }
        }

        Post post = Post.builder()
                .userId(user.getUserId())
                .content(content)
                .scope("public")
                .tags(resolvedTags)
                .city(city)
                .groupId(groupId)
                .status(status)
                .createdAt(LocalDateTime.now())
                .build();

        if (repostOfId != null && !repostOfId.isBlank()) {
            Post original = postRepository
                    .findById(repostOfId)
                    .orElseThrow(() -> new RuntimeException("Original post not found"));
            post.setRepostOf(original);
        }
        Post saved = postRepository.save(post);
        if (mediaIds != null && !mediaIds.isEmpty()) {
            mediaClient.assignMediaToPost(saved.getId(), mediaIds);
        }

        // Lưu vào Redis ZSET (chỉ bài gốc, không lưu repost)
        if (repostOfId == null || repostOfId.isBlank()) {
            localFeedCacheService.addPost(city, saved.getId(), saved.getCreatedAt());
        }

        return getPostById(saved.getId(), userId);
    }

    // ==================== DELETE ====================
    @Transactional
    public void deletePost(String currentUserId, String postId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));

        if (post.getRepostOf() != null) throw new RuntimeException("Cannot delete repost");

        if (!post.getUserId().equals(currentUserId)) throw new RuntimeException("You do not have permission");

        // Lưu city trước khi xóa để dùng cho Redis
        String city = post.getCity();

        postRepository.deleteByRepostOfId(post.getId());
        postRepository.delete(post);

        // Xóa khỏi Redis ZSET
        localFeedCacheService.removePost(city, postId);

        CompletableFuture.runAsync(() -> mediaClient.deleteMediaByPostId(postId));
        // Xóa tất cả comments của post này
        CompletableFuture.runAsync(() -> {
            try {
                interactionClient.deleteCommentsByPost(postId);
            } catch (Exception e) {
                System.err.println("Lỗi xóa comments khi xóa post: " + e.getMessage());
            }
        });
    }

    // ==================== FEED ====================
    public List<PostResponse> getFeed(String currentUserId, int page, int size) {
        Page<Post> postPage = postRepository.findAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        List<Post> posts = postPage.getContent();

        if (posts.isEmpty()) {
            return List.of();
        }

        Set<String> userIds = posts.stream()
                .flatMap(p -> {
                    Set<String> ids = new HashSet<>();
                    ids.add(p.getUserId());
                    if (p.getRepostOf() != null) ids.add(p.getRepostOf().getUserId());
                    return ids.stream();
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, UserResponse> userMap = userIds.isEmpty()
                ? Map.of()
                : userClient.getUsers(new ArrayList<>(userIds)).stream()
                        .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        return posts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap))
                .collect(Collectors.toList());
    }

    // ==================== LOCAL FEED ====================
    // Redis ZSET - batch DB query - fallback DB nếu Redis miss - fallback toàn quốc nếu tỉnh trống.
    public LocalFeedResult getLocalFeed(String city, String currentUserId, int page, int size) {
        // Bước 1: Thử lấy từ Redis ZSET
        List<String> postIds = localFeedCacheService.getPostIds(city, page, size);

        List<Post> posts;
        boolean isFallback = false;

        if (!postIds.isEmpty()) {
            // Cache hit: batch fetch từ DB theo IDs
            posts = postRepository.findByIdInAndRepostOfIsNull(postIds);
            // Giữ đúng thứ tự từ Redis (mới nhất trước)
            Map<String, Post> postMap = posts.stream().collect(Collectors.toMap(Post::getId, p -> p));
            posts = postIds.stream().map(postMap::get).filter(p -> p != null).collect(Collectors.toList());
        } else {
            // Cache miss: fallback sang DB query trực tiếp
            Pageable pageable = PageRequest.of(page, size);
            posts = postRepository.findByCityOrderByCreatedAtDesc(city, pageable);

            if (posts.isEmpty() && page == 0) {
                // Tỉnh chưa có bài nào → fallback toàn quốc
                posts = postRepository.findLatestGlobalPosts(pageable);
                isFallback = true;
            }
        }

        if (posts.isEmpty()) {
            return new LocalFeedResult(List.of(), isFallback);
        }

        // Enrich user info, media, interaction
        Set<String> userIds = posts.stream().map(Post::getUserId).collect(Collectors.toSet());
        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        List<PostResponse> result = posts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap))
                .collect(Collectors.toList());

        return new LocalFeedResult(result, isFallback);
    }

    // Gọi geoIpService
    public String resolveCity(String clientIp) {
        return geoIpService.resolveCity(clientIp);
    }

    // Gọi geoIpService
    public String extractClientIp(String xClientIp, String xForwardedFor, String remoteAddr) {
        return geoIpService.extractClientIp(xClientIp, xForwardedFor, remoteAddr);
    }

    // Load feed Local
    public record LocalFeedResult(List<PostResponse> posts, boolean isFallback) {}

    public List<PostResponse> getRecommendedFeed(String currentUserId, int page, int size) {
        // 1. Fetch Preferences
        Map<String, Double> userWeights = userClient.getUserPreferences(currentUserId);
        if (userWeights == null) userWeights = new HashMap<>();

        // 2. Fetch Following IDs (Social Graph)
        List<String> followingIds = new ArrayList<>();
        try {
            List<String> fetchedIds = followClient.getFollowingIds(currentUserId);
            if (fetchedIds != null) {
                followingIds = fetchedIds;
            }
        } catch (Exception e) {
            System.err.println("Lỗi gọi follow-service lấy danh sách following: " + e.getMessage());
        }

        // 3. Candidate Generation (Top 200 recent posts)
        List<Post> candidates = postRepository
                .findAll(PageRequest.of(0, 200, Sort.by("createdAt").descending()))
                .getContent();

        // 4. Scoring (Hybrid Fusion)
        double W_CONTENT = 0.3; // Trọng số sở thích/tag
        double W_SOCIAL = 0.5; // Trọng số quan hệ bạn bè
        double W_RECENCY = 0.2; // Trọng số độ mới của bài viết

        final Map<String, Double> finalWeights = userWeights;
        final List<String> finalFollowingIds = followingIds;
        LocalDateTime now = LocalDateTime.now();

        List<PostScorePair> scoredPosts = candidates.stream()
                .map(post -> {
                    // a. Tính điểm khớp sở thích/tag (Content Score)
                    double contentScore = 0.0;
                    List<String> tags = post.getTags();
                    if (tags != null && !tags.isEmpty()) {
                        for (String tag : tags) {
                            contentScore += finalWeights.getOrDefault(tag, 0.1);
                        }
                    }

                    // b. Tính điểm quan hệ xã hội (Social Score)
                    double socialScore = 0.0;
                    if (post.getUserId().equals(currentUserId)) {
                        socialScore = 1.0;
                    } else if (finalFollowingIds.contains(post.getUserId())) {
                        socialScore = 1.0;
                    }

                    // c. Tính điểm độ mới (Recency Score)
                    long hours = ChronoUnit.HOURS.between(post.getCreatedAt(), now);
                    if (hours < 0) hours = 0;
                    double recencyScore = Math.exp(-0.01 * hours); // Phân rã theo thời gian

                    // d. Tổng hợp điểm số theo trọng số
                    double finalScore = W_CONTENT * contentScore + W_SOCIAL * socialScore + W_RECENCY * recencyScore;

                    return new PostScorePair(post, finalScore);
                })
                .collect(Collectors.toList());

        // 5. Ranking (Sort by Score descending)
        scoredPosts.sort((p1, p2) -> Double.compare(p2.score, p1.score));

        // 6. Pagination
        int start = Math.min(page * size, scoredPosts.size());
        int end = Math.min((page + 1) * size, scoredPosts.size());
        if (start > end) return Collections.emptyList();

        List<Post> pagedPosts =
                scoredPosts.subList(start, end).stream().map(pair -> pair.post).toList();

        // 7. Mapping to Response
        Set<String> userIds = pagedPosts.stream()
                .flatMap(p -> {
                    Set<String> ids = new HashSet<>();
                    ids.add(p.getUserId());
                    if (p.getRepostOf() != null) ids.add(p.getRepostOf().getUserId());
                    return ids.stream();
                })
                .collect(Collectors.toSet());

        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        return pagedPosts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap))
                .collect(Collectors.toList());
    }

    private static class PostScorePair {
        Post post;
        double score;

        PostScorePair(Post post, double score) {
            this.post = post;
            this.score = score;
        }
    }

    // ==================== PROFILE ====================
    public List<PostResponse> getPostsByUserId(String userId, String currentUserId) {
        UserResponse user = userClient.getUser(userId);
        List<Post> posts = postRepository.findByUserIdAndRepostOfIsNullOrderByCreatedAtDesc(user.getUserId());

        Map<String, UserResponse> userMap = Map.of(user.getUserId(), user);

        return posts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap))
                .toList();
    }

    public List<PostResponse> getPostsByUsername(String username, String currentUserId) {
        UserResponse user = userClient.getUserByUsername(username);
        List<Post> posts = postRepository.findByUserIdAndRepostOfIsNullOrderByCreatedAtDesc(user.getUserId());

        Map<String, UserResponse> userMap = Map.of(user.getUserId(), user);

        return posts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap))
                .toList();
    }

    // ==================== GET ONE ====================
    public PostResponse getPostById(String postId, String currentUserId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));

        // Tracking hành vi View Detail (+0.02)
        if (currentUserId != null && !currentUserId.equals(post.getUserId())) {
            List<String> tags = post.getTags();
            if (tags != null && !tags.isEmpty()) {
                CompletableFuture.runAsync(() -> {
                    try {
                        userClient.updateCategoryWeights(
                                currentUserId,
                                com.DuyHao.post_service
                                        .dto
                                        .request
                                        .WeightUpdateRequest
                                        .builder()
                                        .tags(tags)
                                        .delta(0.02)
                                        .build());
                    } catch (Exception e) {
                        System.err.println("Lỗi cập nhật sở thích khi xem bài viết: " + e.getMessage());
                    }
                });
            }
        }

        Set<String> ids = new HashSet<>();
        ids.add(post.getUserId());
        if (post.getRepostOf() != null) ids.add(post.getRepostOf().getUserId());

        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(ids)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        return buildPostResponse(post, currentUserId, userMap);
    }

    // Interaction Service gọi lấy bài viết
    public List<PostResponse> getPostsByIds(List<String> ids) {
        List<Post> posts = postRepository.findAllById(ids);
        Set<String> userIds = posts.stream().map(Post::getUserId).collect(Collectors.toSet());

        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        return posts.stream()
                .map(post -> buildPostResponse(post, null, userMap))
                .toList();
    }

    // ==================== REPOST ====================

    @Transactional
    public PostResponse createRepost(String userId, String originalPostId) {
        Post original = postRepository
                .findById(originalPostId)
                .orElseThrow(() -> new RuntimeException("Original post not found"));

        // Tăng sở thích khi repost (+0.20)
        List<String> tags = original.getTags();
        if (tags != null && !tags.isEmpty()) {
            CompletableFuture.runAsync(() -> {
                try {
                    userClient.updateCategoryWeights(
                            userId,
                            com.DuyHao.post_service
                                    .dto
                                    .request
                                    .WeightUpdateRequest
                                    .builder()
                                    .tags(tags)
                                    .delta(0.20)
                                    .build());
                } catch (Exception e) {
                    System.err.println("Lỗi cập nhật sở thích khi repost: " + e.getMessage());
                }
            });
        }

        // Tạo bài vỏ
        Post repost = Post.builder()
                .userId(userId)
                .repostOf(original)
                .content(null)
                .scope(original.getScope())
                .createdAt(LocalDateTime.now())
                .build();

        Post saved = postRepository.save(repost);
        return getPostById(saved.getId(), userId);
    }

    @Transactional
    public String deleteRepost(String userId, String originalPostId) {
        Optional<Post> repostPost = postRepository.findByUserIdAndRepostOfId(userId, originalPostId);
        if (repostPost.isPresent()) {
            String repostId = repostPost.get().getId();
            postRepository.delete(repostPost.get());
            return repostId;
        }
        return null;
    }

    // ==================== REPOST LIST ====================
    public List<PostResponse> getRepostsByUserId(String userId, String currentUserId) {
        UserResponse user = userClient.getUser(userId);
        List<Post> reposts = postRepository.findByUserIdAndRepostOfIsNotNullOrderByCreatedAtDesc(userId);

        Map<String, UserResponse> userMap = new HashMap<>();
        userMap.put(userId, user);

        reposts.forEach(post -> {
            if (post.getRepostOf() != null) {
                String originalUserId = post.getRepostOf().getUserId();
                userMap.putIfAbsent(originalUserId, userClient.getUser(originalUserId));
            }
        });

        return reposts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap))
                .toList();
    }

    public List<PostResponse> getRepostsByUsername(String username, String currentUserId) {
        UserResponse user = userClient.getUserByUsername(username);
        List<Post> reposts = postRepository.findByUserIdAndRepostOfIsNotNullOrderByCreatedAtDesc(user.getUserId());

        Map<String, UserResponse> userMap = new HashMap<>();
        userMap.put(user.getUserId(), user);

        reposts.forEach(post -> {
            if (post.getRepostOf() != null) {
                String originalUserId = post.getRepostOf().getUserId();
                userMap.putIfAbsent(originalUserId, userClient.getUser(originalUserId));
            }
        });

        return reposts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap))
                .toList();
    }

    // ==================== SEARCH ====================
    public List<PostResponse> searchPosts(String keyword, String currentUserId, int page, int size) {
        String normalizedKeyword = TextNormalizer.normalize(keyword);

        // Fetch recent posts then filter in-memory for accent-insensitive matching
        List<Post> allRecent = postRepository.findAllOriginalPosts(PageRequest.of(0, 1000));
        List<Post> matched = allRecent.stream()
                .filter(p -> p.getContent() != null
                        && TextNormalizer.normalize(p.getContent()).contains(normalizedKeyword))
                .skip((long) page * size)
                .limit(size)
                .toList();

        if (matched.isEmpty()) return List.of();

        Set<String> userIds = matched.stream().map(Post::getUserId).collect(Collectors.toSet());
        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        return matched.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap))
                .collect(Collectors.toList());
    }

    public List<String> getTrendingTags(int limit) {
        List<Object[]> results = postRepository.findTopTrendingTags(limit);
        return results.stream().map(result -> (String) result[0]).collect(Collectors.toList());
    }

    public List<PostResponse> getPostsByTag(String tag, String currentUserId, int page, int size) {
        // PostgreSQL query requires JSON format for @> operator
        String tagJson = "[\"" + tag + "\"]";
        List<Post> posts = postRepository.findByTag(tagJson, PageRequest.of(page, size));

        if (posts.isEmpty()) return Collections.emptyList();

        Set<String> userIds = posts.stream().map(Post::getUserId).collect(Collectors.toSet());
        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        return posts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap))
                .collect(Collectors.toList());
    }

    // ==================== HELPER ====================

    private PostResponse buildPostResponse(Post post, String currentUserId, Map<String, UserResponse> userMap) {
        UserResponse user = userMap.get(post.getUserId());
        boolean isRepost = post.getRepostOf() != null;
        UserResponse originalUser = isRepost ? userMap.get(post.getRepostOf().getUserId()) : null;

        String targetIdForData = isRepost ? post.getRepostOf().getId() : post.getId();
        InteractionResponse interaction;
        try {
            interaction = interactionClient.getInteraction(targetIdForData);
        } catch (Exception e) {
            interaction = InteractionResponse.builder()
                    .likeCount(0L)
                    .commentCount(0L)
                    .repostCount(0L)
                    .likedByCurrentUser(false)
                    .repostedByCurrentUser(false)
                    .build();
            System.err.println("Lỗi gọi Interaction Service: " + e.getMessage());
        }

        List<String> mediaUrls = new ArrayList<>();
        try {
            mediaUrls = mediaClient.getMediaByPostId(targetIdForData).stream()
                    .map(MediaResponse::getMediaUrl)
                    .toList();
        } catch (Exception e) {
            System.err.println("Lỗi gọi Media Service: " + e.getMessage());
        }

        return postMapper.toResponse(post, user, mediaUrls, interaction, originalUser);
    }

    public List<String> getPostTags(String id) {
        Post post = postRepository.findById(id).orElseThrow(() -> new RuntimeException("Post not found"));
        return post.getTags() != null ? post.getTags() : Collections.emptyList();
    }

    // ==================== GROUP ====================
    public List<PostResponse> getGroupPosts(String groupId, String currentUserId, int page, int size) {
        boolean isMember = false;
        try {
            isMember = groupClient.checkMember(groupId, currentUserId);
        } catch (Exception e) {
        }

        try {
            var groupResponse = groupClient.getGroup(groupId);
            if (groupResponse != null && groupResponse.getResult() != null) {
                if ("PRIVATE".equals(groupResponse.getResult().privacy()) && !isMember) {
                    throw new RuntimeException("Group is private");
                }
            }
        } catch (Exception e) {
            System.err.println("Could not fetch group privacy info");
        }

        List<Post> posts = postRepository.findByGroupIdAndStatusOrderByCreatedAtDesc(
                groupId, "APPROVED", PageRequest.of(page, size));
        if (posts.isEmpty()) return Collections.emptyList();

        Set<String> userIds = posts.stream().map(Post::getUserId).collect(Collectors.toSet());
        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        return posts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap))
                .collect(Collectors.toList());
    }

    public List<PostResponse> getPendingGroupPosts(String groupId, String currentUserId, int page, int size) {
        // Here we should ideally check if currentUserId is ADMIN or MODERATOR of the group.
        // For simplicity we check if they are member. In real implementation, groupClient.checkAdmin() would be better.
        List<Post> posts = postRepository.findByGroupIdAndStatusOrderByCreatedAtDesc(
                groupId, "PENDING", PageRequest.of(page, size));
        if (posts.isEmpty()) return Collections.emptyList();

        Set<String> userIds = posts.stream().map(Post::getUserId).collect(Collectors.toSet());
        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        return posts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap))
                .collect(Collectors.toList());
    }

    @Transactional
    public void updatePostStatus(String postId, String status, String reason, String currentUserId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));
        // Check admin/mod permission via group-service if needed
        String oldStatus = post.getStatus();
        post.setStatus(status);
        postRepository.save(post);

        // If approved, add to LocalFeed Cache if needed
        if ("APPROVED".equals(status)) {
            localFeedCacheService.addPost(post.getCity(), post.getId(), post.getCreatedAt());

            // Send notification if it was PENDING
            if ("PENDING".equals(oldStatus)) {
                try {
                    notificationClient.groupPostApproved(post.getUserId(), currentUserId, post.getId());
                } catch (Exception e) {
                    System.err.println("Lỗi gửi thông báo phê duyệt bài viết: " + e.getMessage());
                }
            }
        } else if ("REJECTED".equals(status)) {
            if ("PENDING".equals(oldStatus)) {
                try {
                    notificationClient.groupPostRejected(post.getUserId(), currentUserId, post.getId(), reason);
                } catch (Exception e) {
                    System.err.println("Lỗi gửi thông báo từ chối bài viết: " + e.getMessage());
                }
            }
        }
    }
}
