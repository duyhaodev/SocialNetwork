package com.DuyHao.follow_service.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.DuyHao.follow_service.client.NotificationClient;
import com.DuyHao.follow_service.client.UserClient;
import com.DuyHao.follow_service.dto.FollowResponse;
import com.DuyHao.follow_service.entity.Follow;
import com.DuyHao.follow_service.repository.FollowRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepo;
    private final UserClient userClient;
    private final NotificationClient notificationClient;

    @Transactional
    public FollowResponse followUser(String followerId, String followingId) {

        if (followerId.equals(followingId)) throw new RuntimeException("Cannot follow yourself");

        if (followRepo.existsByFollowerIdAndFollowingId(followerId, followingId))
            throw new RuntimeException("Already following");

        Follow follow = Follow.builder()
                .id(UUID.randomUUID().toString())
                .followerId(followerId)
                .followingId(followingId)
                .createdAt(LocalDateTime.now())
                .build();

        followRepo.save(follow);

        // Kiểm tra có phải follow back không (followingId đã follow followerId từ trước)
        boolean isFollowBack = followRepo.existsByFollowerIdAndFollowingId(followingId, followerId);

        // Tạo notification "followerId followed you" cho followingId (như bình thường)
        try {
            notificationClient.createFollowNotification(followingId, followerId);
        } catch (Exception e) {
            System.err.println("Lỗi tạo follow notification: " + e.getMessage());
        }

        // Nếu đây là follow back → đánh dấu notification cũ "followingId followed you"
        // của followerId là RESOLVED (để ẩn ở tab All, vẫn giữ ở tab Follows)
        if (isFollowBack) {
            try {
                notificationClient.resolveFollowNotification(followerId, followingId);
            } catch (Exception e) {
                System.err.println("Lỗi resolve follow notification: " + e.getMessage());
            }
        }

        // call user service
        userClient.incrementFollowers(followingId);
        userClient.incrementFollowing(followerId);

        boolean isFriend = isFollowBack;

        return FollowResponse.builder()
                .success(true)
                .isFollowing(true)
                .isFriend(isFriend)
                .message(isFriend ? "You are now friends" : "Followed successfully")
                .build();
    }

    @Transactional
    public FollowResponse unfollowUser(String followerId, String followingId) {

        if (!followRepo.existsByFollowerIdAndFollowingId(followerId, followingId))
            throw new RuntimeException("Not following");

        followRepo.deleteByFollowerIdAndFollowingId(followerId, followingId);

        // Gỡ notification follow đã tạo trước đó
        try {
            notificationClient.deleteFollowNotification(followingId, followerId);
        } catch (Exception e) {
            System.err.println("Lỗi gỡ follow notification: " + e.getMessage());
        }

        userClient.decrementFollowers(followingId);
        userClient.decrementFollowing(followerId);

        return FollowResponse.builder()
                .success(true)
                .isFollowing(false)
                .isFriend(false)
                .message("Unfollowed successfully")
                .build();
    }

    public boolean isFollowing(String followerId, String followingId) {
        return followRepo.existsByFollowerIdAndFollowingId(followerId, followingId);
    }

    public FollowResponse getFollowStatus(String currentUserId, String targetUserId) {
        boolean isFollowing = followRepo.existsByFollowerIdAndFollowingId(currentUserId, targetUserId);
        boolean isFriend = isFollowing && followRepo.existsByFollowerIdAndFollowingId(targetUserId, currentUserId);

        return FollowResponse.builder()
                .success(true)
                .isFollowing(isFollowing)
                .isFriend(isFriend)
                .message("OK")
                .build();
    }

    // Lấy danh sách người đang follow userId (followers)
    public List<String> getFollowerIds(String userId) {
        return followRepo.findByFollowingId(userId).stream()
                .map(f -> f.getFollowerId())
                .toList();
    }

    // Lấy danh sách userId đang follow (following)
    public List<String> getFollowingIds(String userId) {
        return followRepo.findByFollowerId(userId).stream()
                .map(f -> f.getFollowingId())
                .toList();
    }

    // Lấy danh sách bạn bè (follow 2 chiều)
    public List<String> getFriendIds(String userId) {
        Set<String> followings = followRepo.findByFollowerId(userId).stream()
                .map(f -> f.getFollowingId())
                .collect(java.util.stream.Collectors.toSet());

        return followRepo.findByFollowingId(userId).stream()
                .map(f -> f.getFollowerId())
                .filter(followings::contains)
                .toList();
    }
}
