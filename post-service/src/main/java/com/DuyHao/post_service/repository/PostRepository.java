package com.DuyHao.post_service.repository;

import com.DuyHao.post_service.entity.Post;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface PostRepository extends JpaRepository<Post, String> {

    // Lấy danh sách bài viết gốc (không phải repost)
    List<Post> findByUserIdAndRepostOfIsNullOrderByCreatedAtDesc(String userId);

    // Lấy danh sách các bài đã repost
    List<Post> findByUserIdAndRepostOfIsNotNullOrderByCreatedAtDesc(String userId);

    Optional<Post> findByUserIdAndRepostOfId(String userId, String originalPostId);

    @Modifying
    @Transactional
    void deleteByRepostOfId(String originalPostId);
}