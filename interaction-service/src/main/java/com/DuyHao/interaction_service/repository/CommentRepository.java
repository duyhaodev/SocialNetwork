package com.DuyHao.interaction_service.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.DuyHao.interaction_service.entity.Comment;

public interface CommentRepository extends JpaRepository<Comment, String> {

    // Lấy những comment gốc của bài Post
    Page<Comment> findByPostIdAndParentIdIsNullOrderByCreatedAtDesc(String postId, Pageable pageable);

    // Lấy tất cả reply của một comment cha (theo parentId)
    List<Comment> findByParentIdOrderByCreatedAtAsc(String parentId);

}