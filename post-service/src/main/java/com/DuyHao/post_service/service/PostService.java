package com.DuyHao.post_service.service;

import com.DuyHao.post_service.FeignClient.InteractionClient;
import com.DuyHao.post_service.FeignClient.MediaClient;
import com.DuyHao.post_service.FeignClient.UserClient;
import com.DuyHao.post_service.dto.response.*;
import com.DuyHao.post_service.entity.Post;
import com.DuyHao.post_service.mapper.PostMapper;
import com.DuyHao.post_service.repository.PostRepository;
import java.time.LocalDateTime;
import java.util.*;
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

    // ==================== CREATE ====================
    public PostResponse create(String userId, String content, String repostOfId, List<String> mediaIds) {
        UserResponse user = userClient.getUser(userId);

        Post post = Post.builder()
                .userId(user.getUserId())
                .content(content)
                .scope("public")
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
        return getPostById(saved.getId(), userId);
    }

    // ==================== DELETE ====================
    @Transactional
    public void deletePost(String currentUserId, String postId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));

        if (post.getRepostOf() != null) throw new RuntimeException("Cannot delete repost");

        if (!post.getUserId().equals(currentUserId)) throw new RuntimeException("You do not have permission");

        postRepository.deleteByRepostOf_Id(post.getId());
        postRepository.delete(post);
        mediaClient.deleteMediaByPostId(postId);
    }

    // ==================== FEED ====================
    public List<PostResponse> getFeed(String currentUserId, int page, int size) {
        Page<Post> postPage = postRepository.findAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        List<Post> posts = postPage.getContent();

        Set<String> userIds = posts.stream()
                .flatMap(p -> {
                    Set<String> ids = new HashSet<>();
                    ids.add(p.getUserId());
                    if (p.getRepostOf() != null) ids.add(p.getRepostOf().getUserId());
                    return ids.stream();
                })
                .collect(Collectors.toSet());

        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        return posts.stream()
                .map(post -> buildPostResponse(post, currentUserId, userMap))
                .collect(Collectors.toList());
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

    // ==================== HELPER ====================
    //    private PostResponse buildPostResponse(Post post, String currentUserId, Map<String, UserResponse> userMap) {
    //
    //        UserResponse user = userMap.get(post.getUserId());
    //        String originalId = post.getRepostOf() != null ? post.getRepostOf().getId() : post.getId();
    //        UserResponse originalUser = post.getRepostOf() != null ? userMap.get(post.getRepostOf().getUserId()) :
    // null;
    //
    //        InteractionResponse interaction = interactionClient.getInteraction(originalId, currentUserId);
    //
    //        // Lấy media URLs từ Media Service theo postId
    //        List<String> mediaUrls = mediaClient.getMediaByPostId(post.getId())
    //                .stream()
    //                .map(MediaResponse::getMediaUrl)
    //                .toList();
    //
    //        return postMapper.toResponse(post, user, mediaUrls, interaction, originalUser);
    //    }

    //    private PostResponse buildPostResponse(Post post, String currentUserId, Map<String, UserResponse> userMap) {
    //        UserResponse user = userMap.get(post.getUserId());
    //        UserResponse originalUser = post.getRepostOf() != null ? userMap.get(post.getRepostOf().getUserId()) :
    // null;
    //
    //        // Tạo một đối tượng trống với các giá trị mặc định (0 like, 0 comment)
    //        InteractionResponse interaction = InteractionResponse.builder()
    //                .likeCount(0L)
    //                .commentCount(0L)
    //                .repostCount(0L)
    //                .likedByCurrentUser(false)
    //                .repostedByCurrentUser(false)
    //                .build();
    //
    //        List<String> mediaUrls = new ArrayList<>();
    //
    //        return postMapper.toResponse(post, user, mediaUrls, interaction, originalUser);
    //    }

    private PostResponse buildPostResponse(Post post, String currentUserId, Map<String, UserResponse> userMap) {
        UserResponse user = userMap.get(post.getUserId());
        UserResponse originalUser =
                post.getRepostOf() != null ? userMap.get(post.getRepostOf().getUserId()) : null;
        String originalId = post.getRepostOf() != null ? post.getRepostOf().getId() : post.getId();

        InteractionResponse interaction = InteractionResponse.builder()
                .likeCount(0L)
                .commentCount(0L)
                .repostCount(0L)
                .likedByCurrentUser(false)
                .repostedByCurrentUser(false)
                .build();

        List<String> mediaUrls = new ArrayList<>();
        try {
            mediaUrls = mediaClient.getMediaByPostId(post.getId()).stream()
                    .map(MediaResponse::getMediaUrl)
                    .toList();
        } catch (Exception e) {
            System.err.println("Lỗi gọi Media Service cho Post " + post.getId() + ": " + e.getMessage());
        }
        return postMapper.toResponse(post, user, mediaUrls, interaction, originalUser);
    }
}
