package com.DuyHao.interaction_service.service;

import com.DuyHao.interaction_service.FeignClient.NotificationClient;
import com.DuyHao.interaction_service.FeignClient.PostClient;
import com.DuyHao.interaction_service.dto.response.PostResponse; // Import ở đây nè!
import com.DuyHao.interaction_service.dto.response.RepostResponse;
import com.DuyHao.interaction_service.entity.Repost;
import com.DuyHao.interaction_service.repository.RepostRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RepostService {

    private final RepostRepository repostRepository;
    private final PostClient postClient;
    private final NotificationClient notificationClient;

    @Transactional
    public RepostResponse toggleRepost(String postId, String userId) {
        try {
            var originalPost = postClient.getPost(postId);
            if (originalPost == null) throw new RuntimeException("Bài viết không tồn tại");

            boolean alreadyReposted = repostRepository.existsByUserIdAndPostId(userId, postId);
            PostResponse newRepostPost = null;
            String deletedId = null;
            String postOwnerId = originalPost.getUserId();

            if (alreadyReposted) {
                repostRepository.deleteByUserIdAndPostId(userId, postId);
                deletedId = postClient.deleteRepost(userId, postId);
                try {
                    notificationClient.unrepost(postOwnerId, userId, postId);
                } catch (Exception e) {
                    System.err.println("Lỗi gỡ notification repost: " + e.getMessage());
                }

            } else {
                Repost repost = Repost.builder()
                        .userId(userId)
                        .postId(postId)
                        .createdAt(LocalDateTime.now())
                        .build();
                repostRepository.save(repost);
                newRepostPost = postClient.createRepost(userId, postId);
                try {
                    notificationClient.repost(postOwnerId, userId, postId);
                } catch (Exception e) {
                    System.err.println("Lỗi tạo notification repost: " + e.getMessage());
                }
            }
            long count = repostRepository.countByPostId(postId);
            if (newRepostPost != null) {
                newRepostPost.setRepostCount(count);
                newRepostPost.setRepostedByCurrentUser(true);
            }

            return RepostResponse.builder()
                    .reposted(!alreadyReposted)
                    .repostCount(count)
                    .post(newRepostPost)
                    .deletedRepostId(deletedId)
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Lỗi xử lý tương tác: " + e.getMessage());
        }
    }
}
