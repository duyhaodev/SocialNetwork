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
}