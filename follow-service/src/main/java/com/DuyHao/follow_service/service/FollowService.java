package com.DuyHao.follow_service.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;

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

        // call notification service
        notificationClient.createFollowNotification(followingId, followerId);

        // call user service
        userClient.incrementFollowers(followingId);
        userClient.incrementFollowing(followerId);

        return FollowResponse.builder()
                .success(true)
                .isFollowing(true)
                .message("Followed successfully")
                .build();
    }

    public FollowResponse unfollowUser(String followerId, String followingId) {

        if (!followRepo.existsByFollowerIdAndFollowingId(followerId, followingId))
            throw new RuntimeException("Not following");

        followRepo.deleteByFollowerIdAndFollowingId(followerId, followingId);

        userClient.decrementFollowers(followingId);
        userClient.decrementFollowing(followerId);

        return FollowResponse.builder()
                .success(true)
                .isFollowing(false)
                .message("Unfollowed successfully")
                .build();
    }

    public boolean isFollowing(String followerId, String followingId) {
        return followRepo.existsByFollowerIdAndFollowingId(followerId, followingId);
    }
}
