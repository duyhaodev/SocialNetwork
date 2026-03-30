package com.DuyHao.follow_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.DuyHao.follow_service.entity.Follow;

@Repository
public interface FollowRepository extends JpaRepository<Follow, String> {
    @Query("SELECT COUNT(f) > 0 FROM Follow f WHERE f.followerId = :followerId AND f.followingId = :followingId")
    boolean existsByFollowerAndFollowing(
            @Param("followerId") String followerId, @Param("followingId") String followingId);

    @Modifying
    @Query("DELETE FROM Follow f WHERE f.followerId = :followerId AND f.followingId = :followingId")
    void deleteByFollowerIdAndFollowingId(
            @Param("followerId") String followerId, @Param("followingId") String followingId);
}
