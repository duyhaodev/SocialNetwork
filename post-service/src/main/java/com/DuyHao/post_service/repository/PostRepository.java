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
    @Query(
            "SELECT p FROM Post p WHERE p.userId = :userId AND p.repostOf IS NULL AND (p.status IS NULL OR p.status != 'HIDDEN') ORDER BY p.createdAt DESC")
    List<Post> findByUserIdAndRepostOfIsNullOrderByCreatedAtDesc(@Param("userId") String userId);

    // Lấy danh sách các bài đã repost
    @Query(
            "SELECT p FROM Post p WHERE p.userId = :userId AND p.repostOf IS NOT NULL AND (p.status IS NULL OR p.status != 'HIDDEN') ORDER BY p.createdAt DESC")
    List<Post> findByUserIdAndRepostOfIsNotNullOrderByCreatedAtDesc(@Param("userId") String userId);

    Optional<Post> findByUserIdAndRepostOfId(String userId, String originalPostId);

    @Modifying
    @Transactional
    void deleteByRepostOfId(String originalPostId);

    @Query(
            "SELECT p FROM Post p WHERE p.repostOf IS NULL AND (p.status IS NULL OR p.status != 'HIDDEN') ORDER BY p.createdAt DESC")
    List<Post> findAllOriginalPosts(Pageable pageable);

    // Lấy post theo danh sách id tử Redis không lấy repost
    @Query(
            "SELECT p FROM Post p WHERE p.id IN :ids AND p.repostOf IS NULL AND (p.status IS NULL OR p.status != 'HIDDEN')")
    List<Post> findByIdInAndRepostOfIsNull(@Param("ids") List<String> ids);

    // lấy post theo city (khi redis miss)
    @Query(
            "SELECT p FROM Post p WHERE p.city = :city AND p.repostOf IS NULL AND (p.status IS NULL OR p.status != 'HIDDEN') ORDER BY p.createdAt DESC")
    List<Post> findByCityOrderByCreatedAtDesc(@Param("city") String city, Pageable pageable);

    // Lấy bài mowiss nhất khi local chưa có bài nào
    @Query(
            "SELECT p FROM Post p WHERE p.repostOf IS NULL AND (p.status IS NULL OR p.status != 'HIDDEN') ORDER BY p.createdAt DESC")
    List<Post> findLatestGlobalPosts(Pageable pageable);

    @Query(
            value = "SELECT tag, COUNT(*) as tag_count " + "FROM posts, jsonb_array_elements_text(tags) as tag "
                    + "WHERE status IS NULL OR status != 'HIDDEN' "
                    + "GROUP BY tag "
                    + "ORDER BY tag_count DESC "
                    + "LIMIT :limit",
            nativeQuery = true)
    List<Object[]> findTopTrendingTags(int limit);

    @Query(
            value =
                    "SELECT * FROM posts WHERE tags @> CAST(:tagJson AS jsonb) AND (status IS NULL OR status != 'HIDDEN') ORDER BY created_at DESC",
            nativeQuery = true)
    List<Post> findByTag(@Param("tagJson") String tagJson, Pageable pageable);

    @Query(
            "SELECT p FROM Post p WHERE p.groupId = :groupId AND p.status = :status ORDER BY COALESCE(p.isPinned, false) DESC, p.createdAt DESC")
    List<Post> findGroupPosts(@Param("groupId") String groupId, @Param("status") String status, Pageable pageable);

    @Query(
            "SELECT p FROM Post p WHERE p.groupId IS NULL AND (p.status IS NULL OR p.status != 'HIDDEN') ORDER BY p.createdAt DESC")
    List<Post> findRecentGlobalPosts(Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.groupId IN :groupIds AND p.status = 'APPROVED' ORDER BY p.createdAt DESC")
    List<Post> findRecentGroupPosts(@Param("groupIds") List<String> groupIds, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.groupId = :groupId AND p.userId = :userId ORDER BY p.createdAt DESC")
    List<Post> findUserGroupPostHistory(
            @Param("groupId") String groupId, @Param("userId") String userId, Pageable pageable);
}
