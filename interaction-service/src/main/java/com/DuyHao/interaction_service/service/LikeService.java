package com.DuyHao.interaction_service.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.DuyHao.interaction_service.FeignClient.PostClient;
import com.DuyHao.interaction_service.dto.response.LikeResponse;
import com.DuyHao.interaction_service.entity.Like;
import com.DuyHao.interaction_service.repository.LikeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LikeService {

    private final LikeRepository likeRepository;
    private final PostClient postClient;
    private final CommentService commentService;
    // private final NotificationService notificationService;

    @Transactional
    public LikeResponse togglePostLike(String postId, String userId) {
        try {
            var post = postClient.getPost(postId);
            if (post == null) throw new RuntimeException("Post not found");

            boolean alreadyLiked = likeRepository.existsByUserIdAndPostId(userId, postId);

            if (alreadyLiked) {
                likeRepository.deleteByUserIdAndPostId(userId, postId);
            } else {
                Like like = Like.builder()
                        .userId(userId)
                        .postId(postId)
                        .createdAt(LocalDateTime.now())
                        .build();
                likeRepository.save(like);
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
            }

            long count = likeRepository.countByCommentId(commentId);
            return LikeResponse.builder().liked(!alreadyLiked).likeCount(count).build();

        } catch (Exception e) {
            throw new RuntimeException("Lỗi Like Comment: " + e.getMessage());
        }
    }
}