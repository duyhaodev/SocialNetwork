package com.DuyHao.follow_service.service;

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
@Transactional
public class FollowService {

    private final FollowRepository followRepo;
    private final UserClient userClient;
    private final NotificationClient notificationClient;

    public FollowResponse followUser(String followerId, String followingId) {

        if (followerId.equals(followingId)) throw new RuntimeException("Cannot follow yourself");

        if (followRepo.existsByFollowerAndFollowing(followerId, followingId))
            throw new RuntimeException("Already following");

        Follow follow =
                Follow.builder().followerId(followerId).followingId(followingId).build();

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

        if (!followRepo.existsByFollowerAndFollowing(followerId, followingId))
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
        return followRepo.existsByFollowerAndFollowing(followerId, followingId);
    }
}
