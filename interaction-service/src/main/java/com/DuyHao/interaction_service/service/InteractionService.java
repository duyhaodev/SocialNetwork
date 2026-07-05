package com.DuyHao.interaction_service.service;

import com.DuyHao.interaction_service.dto.response.InteractionResponse;
import com.DuyHao.interaction_service.repository.CommentRepository;
import com.DuyHao.interaction_service.repository.LikeRepository;
import com.DuyHao.interaction_service.repository.RepostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InteractionService {

    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;
    private final RepostRepository repostRepository;

    public InteractionResponse getInteractionStats(String postId, String userId) {

        long likeCount = likeRepository.countByPostId(postId);
        long commentCount = commentRepository.countByPostId(postId);
        long repostCount = repostRepository.countByPostId(postId);

        boolean likedByCurrentUser = false;
        boolean repostedByCurrentUser = false;

        if (userId != null && !userId.isBlank()) {
            likedByCurrentUser = likeRepository.existsByPostIdAndUserId(postId, userId);
            repostedByCurrentUser = repostRepository.existsByPostIdAndUserId(postId, userId);
        }

        return InteractionResponse.builder()
                .likeCount(likeCount)
                .commentCount(commentCount)
                .repostCount(repostCount)
                .likedByCurrentUser(likedByCurrentUser)
                .repostedByCurrentUser(repostedByCurrentUser)
                .build();
    }

    public java.util.Map<String, InteractionResponse> getBulkInteractionStats(java.util.List<String> postIds) {
        if (postIds == null || postIds.isEmpty()) return new java.util.HashMap<>();

        java.util.Map<String, InteractionResponse> map = new java.util.HashMap<>();
        for (String id : postIds) {
            map.put(
                    id,
                    InteractionResponse.builder()
                            .likeCount(0L)
                            .commentCount(0L)
                            .repostCount(0L)
                            .likedByCurrentUser(false)
                            .repostedByCurrentUser(false)
                            .build());
        }

        likeRepository.countBulkByPostIds(postIds).forEach(obj -> {
            String postId = (String) obj[0];
            long count = ((Number) obj[1]).longValue();
            if (map.containsKey(postId)) {
                map.get(postId).setLikeCount(count);
            }
        });

        commentRepository.countBulkByPostIds(postIds).forEach(obj -> {
            String postId = (String) obj[0];
            long count = ((Number) obj[1]).longValue();
            if (map.containsKey(postId)) {
                map.get(postId).setCommentCount(count);
            }
        });

        repostRepository.countBulkByPostIds(postIds).forEach(obj -> {
            String postId = (String) obj[0];
            long count = ((Number) obj[1]).longValue();
            if (map.containsKey(postId)) {
                map.get(postId).setRepostCount(count);
            }
        });

        return map;
    }
}
