package com.DuyHao.post_service.repository;

import com.DuyHao.post_service.entity.Post;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
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

    @Query("SELECT p FROM Post p WHERE p.repostOf IS NULL ORDER BY p.createdAt DESC")
    List<Post> findAllOriginalPosts(Pageable pageable);

    // Lấy post theo danh sách id tử Redis không lấy repost
    @Query("SELECT p FROM Post p WHERE p.id IN :ids AND p.repostOf IS NULL")
    List<Post> findByIdInAndRepostOfIsNull(@Param("ids") List<String> ids);

    // lấy post theo city (khi redis miss)
    @Query("SELECT p FROM Post p WHERE p.city = :city AND p.repostOf IS NULL ORDER BY p.createdAt DESC")
    List<Post> findByCityOrderByCreatedAtDesc(@Param("city") String city, Pageable pageable);

    // Lấy bài mowiss nhất khi local chưa có bài nào
    @Query("SELECT p FROM Post p WHERE p.repostOf IS NULL ORDER BY p.createdAt DESC")
    List<Post> findLatestGlobalPosts(Pageable pageable);
}
