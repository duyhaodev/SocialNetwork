package com.DuyHao.profile_service.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

import com.DuyHao.profile_service.entity.UserProfile;

@Repository
public interface UserProfileRepository extends Neo4jRepository<UserProfile, String> {
    Optional<UserProfile> findByUsername(String username);

    List<UserProfile> findAllByUserIdIn(List<String> userIds);

    Optional<UserProfile> findByUserId(String userId);

    List<UserProfile> findByUsernameContainingIgnoreCase(String keyword);
}
