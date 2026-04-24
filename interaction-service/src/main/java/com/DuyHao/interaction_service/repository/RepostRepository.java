package com.DuyHao.interaction_service.repository;

import com.DuyHao.interaction_service.entity.Repost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RepostRepository extends JpaRepository<Repost, String> {

    boolean existsByUserIdAndPostId(String userId, String postId);

    void deleteByUserIdAndPostId(String userId, String postId);

    long countByPostId(String postId);

    boolean existsByPostIdAndUserId(String postId, String userId);
}
