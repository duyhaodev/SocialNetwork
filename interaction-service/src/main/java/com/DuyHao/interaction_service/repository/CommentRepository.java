package com.DuyHao.interaction_service.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.DuyHao.interaction_service.entity.Comment;

public interface CommentRepository extends JpaRepository<Comment, String> {

    Page<Comment> findByPostIdOrderByCreatedAtDesc(String postId, Pageable pageable);

    Optional<Comment> findByIdAndPostId(String id, String postId);
}
