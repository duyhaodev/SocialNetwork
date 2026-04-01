package com.DuyHao.follow_service.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.DuyHao.follow_service.entity.Follow;

@Repository
public interface FollowRepository extends MongoRepository<Follow, String> {
    boolean existsByFollowerIdAndFollowingId(String followerId, String followingId);

    void deleteByFollowerIdAndFollowingId(String followerId, String followingId);
}
