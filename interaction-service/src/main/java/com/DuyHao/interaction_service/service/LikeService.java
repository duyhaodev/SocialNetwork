package com.DuyHao.interaction_service.service;

import com.DuyHao.interaction_service.FeignClient.NotificationClient;
import com.DuyHao.interaction_service.FeignClient.PostClient;
import com.DuyHao.interaction_service.FeignClient.UserClient;
import com.DuyHao.interaction_service.dto.response.LikeResponse;
import com.DuyHao.interaction_service.dto.response.PostLikersResponse;
import com.DuyHao.interaction_service.dto.response.PostLikersResponse.LikerInfo;
import com.DuyHao.interaction_service.entity.Like;
import com.DuyHao.interaction_service.repository.LikeRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LikeService {

    private final LikeRepository likeRepository;
    private final PostClient postClient;
    private final UserClient userClient;
    private final CommentService commentService;
    private final NotificationClient notificationClient;

    @Transactional
    public LikeResponse togglePostLike(String postId, String userId) {
        try {
            var post = postClient.getPost(postId);
            if (post == null) throw new RuntimeException("Post not found");

            boolean alreadyLiked = likeRepository.existsByUserIdAndPostId(userId, postId);

            String postOwnerId = post.getUserId();

            if (alreadyLiked) {
                likeRepository.deleteByUserIdAndPostId(userId, postId);
                safeNotify(() -> notificationClient.unlikePost(postOwnerId, userId, postId));
            } else {
                Like like = Like.builder()
                        .userId(userId)
                        .postId(postId)
                        .createdAt(LocalDateTime.now())
                        .build();
                likeRepository.save(like);
                safeNotify(() -> notificationClient.likePost(postOwnerId, userId, postId));
            }

            long count = likeRepository.countByPostId(postId);
            return LikeResponse.builder().liked(!alreadyLiked).likeCount(count).build();

        } catch (Exception e) {
            throw new RuntimeException("Lỗi Like Post: " + e.getMessage());
        }
    }

    @Transactional
    public LikeResponse toggleCommentLike(String commentId, String userId) {
        try {
            var comment = commentService.getCommentById(commentId);
            if (comment == null) throw new RuntimeException("Comment not found");

            boolean alreadyLiked = likeRepository.existsByUserIdAndCommentId(userId, commentId);
            String commentOwnerId = comment.getUserId();
            String postId = comment.getPostId();

            if (alreadyLiked) {
                likeRepository.deleteByUserIdAndCommentId(userId, commentId);
                safeNotify(() -> notificationClient.unlikeComment(commentOwnerId, userId, commentId));
            } else {
                Like like = Like.builder()
                        .userId(userId)
                        .postId(postId)
                        .commentId(commentId)
                        .createdAt(LocalDateTime.now())
                        .build();
                likeRepository.save(like);
                safeNotify(() -> notificationClient.likeComment(commentOwnerId, userId, commentId, postId));
            }

            long count = likeRepository.countByCommentId(commentId);
            return LikeResponse.builder().liked(!alreadyLiked).likeCount(count).build();

        } catch (Exception e) {
            throw new RuntimeException("Lỗi Like Comment: " + e.getMessage());
        }
    }

    private void safeNotify(Runnable action) {
        try {
            action.run();
        } catch (Exception ignored) {
        }
    }

    // Lấy danh sách người đã like bài viết (tối đa limit người, mới nhất trước)
    public PostLikersResponse getPostLikers(String postId, int limit) {
        long total = likeRepository.countByPostId(postId);
        if (total == 0) {
            return PostLikersResponse.builder().likers(List.of()).othersCount(0).build();
        }

        List<String> userIds = likeRepository.findUserIdsByPostId(postId, PageRequest.of(0, limit));

        List<LikerInfo> likers = userClient.getUsers(userIds).stream()
                .map(u -> LikerInfo.builder()
                        .userId(u.getUserId() != null ? u.getUserId() : u.getId())
                        .fullName(u.getFullName())
                        .username(u.getUsername())
                        .avatarUrl(u.getAvatarUrl())
                        .build())
                .toList();

        long others = Math.max(0, total - likers.size()); // trừ cho 10 người lấy danh sách ra

        return PostLikersResponse.builder().likers(likers).othersCount(others).build();
    }
}
