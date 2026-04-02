package com.DuyHao.interaction_service.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.DuyHao.interaction_service.entity.Like;

public interface LikeRepository extends JpaRepository<Like, String> {

    boolean existsByUserIdAndPostId(String userId, String postId);

    boolean existsByUserIdAndCommentId(String userId, String commentId);

    long countByPostId(String postId);

    long countByCommentId(String commentId);

    Optional<Like> findByUserIdAndPostId(String userId, String postId);

    Optional<Like> findByUserIdAndCommentId(String userId, String commentId);

    void deleteByUserIdAndPostId(String userId, String postId);

    void deleteByUserIdAndCommentId(String userId, String commentId);
}
