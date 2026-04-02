package com.DuyHao.interaction_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.DuyHao.interaction_service.entity.Repost;

@Repository
public interface RepostRepository extends JpaRepository<Repost, String> {

    boolean existsByUserIdAndPostId(String userId, String postId);

    void deleteByUserIdAndPostId(String userId, String postId);

    long countByPostId(String postId);
}
