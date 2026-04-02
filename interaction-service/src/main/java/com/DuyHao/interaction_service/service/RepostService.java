package com.DuyHao.interaction_service.service;

import com.DuyHao.interaction_service.FeignClient.PostClient;
import com.DuyHao.interaction_service.dto.response.RepostResponse;
import com.DuyHao.interaction_service.entity.Repost;
import com.DuyHao.interaction_service.repository.RepostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RepostService {

    private final RepostRepository repostRepository;
    private final PostClient postClient;
    private final NotificationService notificationService;

    // ================= TOGGLE REPOST =================
    @Transactional
    public RepostResponse toggleRepost(String postId, String userId) {

        // 🔥 check post tồn tại qua post-service
        var post = postClient.getPost(postId);

        boolean alreadyReposted = repostRepository.existsByUserIdAndPostId(userId, postId);

        if (alreadyReposted) {
            repostRepository.deleteByUserIdAndPostId(userId, postId);
        } else {
            Repost repost = Repost.builder()
                    .userId(userId)
                    .postId(postId)
                    .createdAt(LocalDateTime.now())
                    .build();

            repostRepository.save(repost);

            // 🔥 notification
            if (!post.getUserId().equals(userId)) {
                notificationService.createRepostNotification(
                        post.getUserId(),
                        userId,
                        postId
                );
            }
        }

        long count = repostRepository.countByPostId(postId);

        return RepostResponse.builder()
                .reposted(!alreadyReposted)
                .repostCount(count)
                .build();
    }
}