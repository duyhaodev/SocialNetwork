package com.DuyHao.interaction_service.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.DuyHao.interaction_service.FeignClient.PostClient;
import com.DuyHao.interaction_service.dto.response.RepostResponse;
import com.DuyHao.interaction_service.entity.Repost;
import com.DuyHao.interaction_service.repository.RepostRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RepostService {

    private final RepostRepository repostRepository;
    private final PostClient postClient;
    // private final NotificationService notificationService;

    @Transactional
    public RepostResponse toggleRepost(String postId, String userId) {
        try {
            var post = postClient.getPost(postId);
            if (post == null) throw new RuntimeException("Bài viết không tồn tại");
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
                /*
                if (!post.getUserId().equals(userId)) {
                    notificationService.createRepostNotification(post.getUserId(), userId, postId);
                }
                */
            }

            long count = repostRepository.countByPostId(postId);
            return RepostResponse.builder()
                    .reposted(!alreadyReposted)
                    .repostCount(count)
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Lỗi xử lý tương tác: " + e.getMessage());
        }
    }
}