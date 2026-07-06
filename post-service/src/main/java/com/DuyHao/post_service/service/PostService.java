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
import org.springframework.security.access.prepost.PreAuthorize;
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
            String clientIp,
            Boolean isAiGenerated) {
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
                .isAiGenerated(Boolean.TRUE.equals(isAiGenerated))
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
        // Check block list
        List<String> blockList = new ArrayList<>();
        try {
            if (userId != null) {
                blockList = userClient.getBlockList(userId);
            }
        } catch (Exception e) {
        }
        if (blockList.contains(saved.getUserId())) {
            throw new RuntimeException("Bạn không thể tương tác với người dùng này");
        }

        return getPostById(saved.getId(), userId);
    }

    // ==================== DELETE ====================
    @Transactional
    public void deletePost(String currentUserId, String postId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));

        if (post.getRepostOf() != null) throw new RuntimeException("Cannot delete repost");

        boolean hasPermission = post.getUserId().equals(currentUserId);

        // Nếu không phải là tác giả, kiểm tra xem có phải là Admin/Mod của group không
        if (!hasPermission && post.getGroupId() != null && !post.getGroupId().isBlank()) {
            try {
                String role = groupClient.getMemberRole(post.getGroupId(), currentUserId);
                System.out.println("Check group member role for user " + currentUserId + ", group " + post.getGroupId()
                        + ": " + role);
                if (role != null && (role.contains("ADMIN") || role.contains("MODERATOR"))) {
                    hasPermission = true;
                }
            } catch (Exception e) {
                System.err.println("Error calling groupClient.getMemberRole: " + e.getMessage());
            }
        }

        if (!hasPermission) {
            throw new RuntimeException("You do not have permission");
        }

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

        // Fetch Block List
        List<String> blockList = new ArrayList<>();
        if (currentUserId != null) {
            try {
                blockList = userClient.getBlockList(currentUserId);
            } catch (Exception e) {
            }
        }
        final List<String> finalBlockList = blockList;
        posts = posts.stream()
                .filter(p -> !finalBlockList.contains(p.getUserId()))
                .collect(Collectors.toList());

        if (posts.isEmpty()) return List.of();

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
                .map(post -> buildPostResponse(post, currentUserId, userMap, null))
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

        // Fetch Block List
        List<String> blockList = new ArrayList<>();
        if (currentUserId != null) {
            try {
                blockList = userClient.getBlockList(currentUserId);
            } catch (Exception e) {
            }
        }
        final List<String> finalBlockList = blockList;
        posts = posts.stream()
                .filter(p -> !finalBlockList.contains(p.getUserId()))
                .collect(Collectors.toList());

        if (posts.isEmpty()) return new LocalFeedResult(List.of(), isFallback);

        // Enrich user info, media, interaction
        Set<String> userIds = posts.stream().map(Post::getUserId).collect(Collectors.toSet());
        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        List<PostResponse> result = posts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap, null))
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
        // Fetch Block List
        List<String> blockList = new ArrayList<>();
        try {
            if (currentUserId != null) {
                blockList = userClient.getBlockList(currentUserId);
            }
        } catch (Exception e) {
            System.err.println("Lỗi lấy block list: " + e.getMessage());
        }

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

        // 3. Candidate Generation
        Map<String, String> userGroups = groupClient.getUserGroupMap(currentUserId);
        List<String> groupIds = new ArrayList<>(userGroups.keySet());

        List<Post> candidates = new ArrayList<>();
        // Lấy bài Global
        candidates.addAll(postRepository.findRecentGlobalPosts(PageRequest.of(0, 50)));
        // Lấy bài Group mà user đã join
        if (!groupIds.isEmpty()) {
            candidates.addAll(postRepository.findRecentGroupPosts(groupIds, PageRequest.of(0, 50)));
        }

        // Loại bỏ các bài viết từ những người bị block hoặc block mình
        final List<String> finalBlockList = blockList;
        candidates.removeIf(p -> finalBlockList.contains(p.getUserId()));

        // Fetch Bulk Interactions
        List<String> candidatePostIds = candidates.stream().map(Post::getId).toList();
        Map<String, InteractionResponse> bulkInteractions = new HashMap<>();
        try {
            bulkInteractions = interactionClient.getBulkInteractions(candidatePostIds);
        } catch (Exception e) {
            System.err.println("Lỗi lấy bulk interactions: " + e.getMessage());
        }

        // 4. Scoring (Hybrid Fusion)
        double W_CONTENT = 0.2; // Trọng số sở thích/tag
        double W_SOCIAL = 0.3; // Trọng số quan hệ bạn bè
        double W_GROUP = 0.15; // Trọng số nhóm
        double W_RECENCY = 0.1; // Trọng số độ mới của bài viết
        double W_ENGAGEMENT = 0.25; // Trọng số độ phổ biến

        final Map<String, Double> finalWeights = userWeights;
        final List<String> finalFollowingIds = followingIds;
        final Map<String, InteractionResponse> finalInteractions = bulkInteractions;
        LocalDateTime now = LocalDateTime.now();
        Random random = new Random();

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

                    // c. Tính điểm nhóm (Group Score)
                    double groupScore = 0.0;
                    if (post.getGroupId() != null && groupIds.contains(post.getGroupId())) {
                        groupScore = 1.0;
                    }

                    // d. Tính điểm độ mới (Recency Score)
                    long hours = ChronoUnit.HOURS.between(post.getCreatedAt(), now);
                    if (hours < 0) hours = 0;
                    double recencyScore = Math.exp(-0.01 * hours); // Phân rã theo thời gian

                    // e. Tính điểm mức độ phổ biến (Engagement Score)
                    double engagementScore = 0.0;
                    InteractionResponse interaction = finalInteractions.get(post.getId());
                    if (interaction != null) {
                        long likes = interaction.getLikeCount() != null ? interaction.getLikeCount() : 0;
                        long comments = interaction.getCommentCount() != null ? interaction.getCommentCount() : 0;
                        long reposts = interaction.getRepostCount() != null ? interaction.getRepostCount() : 0;
                        double rawEngagement = (likes * 1) + (comments * 2) + (reposts * 3);
                        engagementScore = rawEngagement / (hours + 1.0);
                    }

                    // f. Tổng hợp điểm số theo trọng số
                    double finalScore = W_CONTENT * contentScore
                            + W_SOCIAL * socialScore
                            + W_GROUP * groupScore
                            + W_RECENCY * recencyScore
                            + W_ENGAGEMENT * engagementScore;

                    // g. Yếu tố tình cờ (Serendipity)
                    // Bốc ngẫu nhiên khoảng 10% số bài viết để boost điểm lên một chút
                    if (random.nextDouble() < 0.10) {
                        finalScore += 0.5 + random.nextDouble(); // Boost ngẫu nhiên từ 0.5 đến 1.5
                    }

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
                .map(post -> buildPostResponse(
                        post,
                        currentUserId,
                        userMap,
                        post.getGroupId() != null ? userGroups.get(post.getGroupId()) : null))
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

        if (currentUserId != null) {
            try {
                List<String> blockList = userClient.getBlockList(currentUserId);
                if (blockList.contains(userId)) {
                    throw new RuntimeException("Tài khoản này không tồn tại hoặc bạn không có quyền xem");
                }
            } catch (Exception e) {
            }
        }

        List<Post> posts = postRepository.findByUserIdAndRepostOfIsNullOrderByCreatedAtDesc(user.getUserId());

        Map<String, UserResponse> userMap = Map.of(user.getUserId(), user);

        return posts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap, null))
                .toList();
    }

    public List<PostResponse> getPostsByUsername(String username, String currentUserId) {
        UserResponse user = userClient.getUserByUsername(username);
        List<Post> posts = postRepository.findByUserIdAndRepostOfIsNullOrderByCreatedAtDesc(user.getUserId());

        Map<String, UserResponse> userMap = Map.of(user.getUserId(), user);

        return posts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap, null))
                .toList();
    }

    // ==================== GET ONE ====================
    public PostResponse getPostById(String postId, String currentUserId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));

        if (currentUserId != null) {
            try {
                List<String> blockList = userClient.getBlockList(currentUserId);
                if (blockList.contains(post.getUserId())) {
                    throw new RuntimeException("Bạn không thể xem bài viết này");
                }
            } catch (Exception e) {
            }
        }

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

        return buildPostResponse(post, currentUserId, userMap, null);
    }

    public List<PostResponse> getUserGroupPostHistory(String groupId, String userId, int page, int size) {
        List<Post> posts = postRepository.findUserGroupPostHistory(groupId, userId, PageRequest.of(page, size));

        if (posts.isEmpty()) return List.of();

        Map<String, UserResponse> userMap = userClient.getUsers(List.of(userId)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        return posts.stream()
                .map(post -> buildPostResponse(post, userId, userMap, null))
                .collect(Collectors.toList());
    }

    // Interaction Service gọi lấy bài viết
    public List<PostResponse> getPostsByIds(List<String> ids) {
        List<Post> posts = postRepository.findAllById(ids);
        Set<String> userIds = posts.stream().map(Post::getUserId).collect(Collectors.toSet());

        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        return posts.stream()
                .map(post -> buildPostResponse(post, null, userMap, null))
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
                .map(post -> buildPostResponse(post, currentUserId, userMap, null))
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
                .map(post -> buildPostResponse(post, currentUserId, userMap, null))
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
                .map(post -> buildPostResponse(post, currentUserId, userMap, null))
                .collect(Collectors.toList());
    }

    public List<PostResponse> searchGroupPosts(
            String groupId, String keyword, String currentUserId, int page, int size) {
        String normalizedKeyword = TextNormalizer.normalize(keyword);

        List<Post> allGroupPosts = postRepository.findGroupPosts(groupId, "APPROVED", PageRequest.of(0, 1000));
        List<Post> matched = allGroupPosts.stream()
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
                .map(post -> buildPostResponse(post, currentUserId, userMap, null))
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
                .map(post -> buildPostResponse(post, currentUserId, userMap, null))
                .collect(Collectors.toList());
    }

    // ==================== HELPER ====================

    private PostResponse buildPostResponse(
            Post post, String currentUserId, Map<String, UserResponse> userMap, String groupName) {
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

        return postMapper.toResponse(post, user, mediaUrls, interaction, originalUser, groupName);
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

        com.DuyHao.post_service.dto.ApiResponse<com.DuyHao.post_service.FeignClient.GroupClient.GroupInfo>
                groupResponse = null;
        try {
            groupResponse = groupClient.getGroup(groupId);
            if (groupResponse != null && groupResponse.getResult() != null) {
                if ("PRIVATE".equals(groupResponse.getResult().privacy()) && !isMember) {
                    throw new RuntimeException("Group is private");
                }
            }
        } catch (Exception e) {
            System.err.println("Could not fetch group privacy info");
        }

        List<Post> posts = postRepository.findGroupPosts(groupId, "APPROVED", PageRequest.of(page, size));
        if (posts.isEmpty()) return Collections.emptyList();

        // Fetch Block List
        List<String> blockList = new ArrayList<>();
        if (currentUserId != null) {
            try {
                blockList = userClient.getBlockList(currentUserId);
            } catch (Exception e) {
            }
        }
        final List<String> finalBlockList = blockList;
        posts = posts.stream()
                .filter(p -> !finalBlockList.contains(p.getUserId()))
                .collect(Collectors.toList());

        if (posts.isEmpty()) return Collections.emptyList();

        Set<String> userIds = posts.stream().map(Post::getUserId).collect(Collectors.toSet());
        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        final String fetchedGroupName = groupResponse != null && groupResponse.getResult() != null
                ? groupResponse.getResult().name()
                : null;

        return posts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap, fetchedGroupName))
                .collect(Collectors.toList());
    }

    public List<PostResponse> getPendingGroupPosts(String groupId, String currentUserId, int page, int size) {
        // Here we should ideally check if currentUserId is ADMIN or MODERATOR of the group.
        // For simplicity we check if they are member. In real implementation, groupClient.checkAdmin() would be better.
        List<Post> posts = postRepository.findGroupPosts(groupId, "PENDING", PageRequest.of(page, size));
        if (posts.isEmpty()) return Collections.emptyList();

        Set<String> userIds = posts.stream().map(Post::getUserId).collect(Collectors.toSet());
        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        return posts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap, null))
                .collect(Collectors.toList());
    }

    @Transactional
    public void updatePostStatus(String postId, String status, String reason, String currentUserId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));
        // Check admin/mod permission via group-service if needed
        String oldStatus = post.getStatus();
        post.setStatus(status);
        if (reason != null && !reason.isBlank()) {
            post.setStatusReason(reason);
        }
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
        } else if ("HIDDEN".equals(status)) {
            // Có thể thêm logic gửi thông báo bài viết bị ẩn do vi phạm (tương tự reject)
            try {
                notificationClient.groupPostRejected(post.getUserId(), currentUserId, post.getId(), reason);
            } catch (Exception e) {
                System.err.println("Lỗi gửi thông báo ẩn bài viết: " + e.getMessage());
            }
        }
    }

    public void pinPost(String postId, String userId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));
        if (post.getGroupId() == null || post.getGroupId().isBlank()) {
            throw new RuntimeException("Chỉ có thể ghim bài viết trong nhóm");
        }
        String role = groupClient.getMemberRole(post.getGroupId(), userId);
        if (!"ADMIN".equals(role) && !"MODERATOR".equals(role)) {
            throw new RuntimeException("Bạn không có quyền ghim bài viết");
        }
        post.setIsPinned(!Boolean.TRUE.equals(post.getIsPinned()));
        postRepository.save(post);
    }

    // --- ADMIN METHODS ---
    @PreAuthorize("hasRole('ADMIN')")
    public org.springframework.data.domain.Page<PostResponse> getAllPosts(
            org.springframework.data.domain.Pageable pageable) {
        return postRepository.findAll(pageable).map(postMapper::toPostResponse);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public void deletePostByAdmin(String postId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));
        // Additional cleanup: media, interactions, etc. could be placed here.
        postRepository.delete(post);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public long getPostCount() {
        return postRepository.count();
    }
}
