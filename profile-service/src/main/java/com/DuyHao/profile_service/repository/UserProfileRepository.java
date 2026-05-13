package com.DuyHao.profile_service.repository;

import com.DuyHao.profile_service.entity.UserProfile;
import java.util.List;
import java.util.Optional;

import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.DuyHao.profile_service.entity.UserProfile;

@Repository
public interface UserProfileRepository extends Neo4jRepository<UserProfile, String> {
    Optional<UserProfile> findByUsername(String username);

    List<UserProfile> findAllByUserIdIn(List<String> userIds);

    Optional<UserProfile> findByUserId(String userId);

    List<UserProfile> findByUsernameContainingIgnoreCase(String keyword);

    @Query("MATCH (u:user_profile {userId: $userId}) " + "SET u.followerCount = COALESCE(u.followerCount, 0) + $delta")
    void updateFollowerCount(@Param("userId") String userId, @Param("delta") int delta);

    @Query("MATCH (u:user_profile {userId: $userId}) SET u.followingCount = COALESCE(u.followingCount, 0) + $delta")
    void updateFollowingCount(@Param("userId") String userId, @Param("delta") int delta);

    @Query("MATCH (u:user_profile) RETURN u ORDER BY u.followerCount DESC LIMIT $limit")
    List<UserProfile> findTopByFollowerCount(@Param("limit") int limit);
}
