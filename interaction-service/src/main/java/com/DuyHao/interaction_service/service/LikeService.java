package com.DuyHao.interaction_service.service;

import com.DuyHao.interaction_service.FeignClient.CommentClient;
import com.DuyHao.interaction_service.FeignClient.PostClient;
import com.DuyHao.interaction_service.dto.response.LikeResponse;
import com.DuyHao.interaction_service.entity.Like;
import com.DuyHao.interaction_service.repository.LikeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class LikeService {

    private final LikeRepository likeRepository;
    private final PostClient postClient;
    private final CommentClient commentClient;
    private final NotificationService notificationService;

    // ================= LIKE POST =================
    @Transactional
    public LikeResponse togglePostLike(String postId, String userId) {

        // 🔥 gọi post-service thay vì DB
        var post = postClient.getPost(postId);

        boolean alreadyLiked = likeRepository.existsByUserIdAndPostId(userId, postId);

        if (alreadyLiked) {
            likeRepository.deleteByUserIdAndPostId(userId, postId);
        } else {
            Like like = Like.builder()
                    .userId(userId)
                    .postId(postId)
                    .commentId(null)
                    .createdAt(LocalDateTime.now())
                    .build();

            likeRepository.save(like);

            // notification
            if (!post.getUserId().equals(userId)) {
                notificationService.createLikePostNotification(
                        post.getUserId(),
                        userId,
                        postId
                );
            }
        }

        long count = likeRepository.countByPostId(postId);

        return LikeResponse.builder()
                .liked(!alreadyLiked)
                .likeCount(count)
                .build();
    }

    // ================= LIKE COMMENT =================
    @Transactional
    public LikeResponse toggleCommentLike(String commentId, String userId) {

        // 🔥 gọi comment-service
        var comment = commentClient.getComment(commentId);

        boolean alreadyLiked = likeRepository.existsByUserIdAndCommentId(userId, commentId);

        if (alreadyLiked) {
            likeRepository.deleteByUserIdAndCommentId(userId, commentId);
        } else {
            Like like = Like.builder()
                    .userId(userId)
                    .postId(comment.getPostId())
                    .commentId(commentId)
                    .createdAt(LocalDateTime.now())
                    .build();

            likeRepository.save(like);

            // notification
            if (!comment.getUserId().equals(userId)) {
                notificationService.createLikeCommentNotification(
                        comment.getUserId(),
                        userId,
                        commentId,
                        comment.getPostId()
                );
            }
        }

        long count = likeRepository.countByCommentId(commentId);

        return LikeResponse.builder()
                .liked(!alreadyLiked)
                .likeCount(count)
                .build();
    }
}