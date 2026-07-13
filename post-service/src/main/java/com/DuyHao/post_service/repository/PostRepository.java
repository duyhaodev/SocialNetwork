package com.DuyHao.post_service.repository;

import com.DuyHao.post_service.entity.Post;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
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

    // Lấy post theo danh sách id từ Redis, không lấy repost
    @Query(
            "SELECT p FROM Post p WHERE p.id IN :ids AND p.repostOf IS NULL AND (p.status IS NULL OR p.status != 'HIDDEN')")
    List<Post> findByIdInAndRepostOfIsNull(@Param("ids") List<String> ids);

    // Lấy post theo city (khi redis miss)
    @Query(
            "SELECT p FROM Post p WHERE p.city = :city AND p.groupId IS NULL AND p.repostOf IS NULL AND (p.status IS NULL OR p.status != 'HIDDEN') ORDER BY p.createdAt DESC")
    List<Post> findByCityOrderByCreatedAtDesc(@Param("city") String city, Pageable pageable);

    // Lấy bài mới nhất khi local chưa có bài nào
    @Query(
            "SELECT p FROM Post p WHERE p.repostOf IS NULL AND (p.status IS NULL OR p.status != 'HIDDEN') ORDER BY p.createdAt DESC")
    List<Post> findLatestGlobalPosts(Pageable pageable);

    @Query(
            value = "SELECT tag, COUNT(*) as tag_count "
                    + "FROM posts, jsonb_array_elements_text(tags) as tag "
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

    // Lấy bài cho Posts Moderation:
    // 1. Bài isSensitiveContent = true (user nhấn "Post anyway"), không phải repost, không phải bài group
    // 2. Bài đã bị admin ẩn qua Report Handling (HIDDEN + groupId IS NULL + statusReason có giá trị)
    @Query("SELECT p FROM Post p WHERE p.repostOf IS NULL AND p.groupId IS NULL AND "
            + "(p.isSensitiveContent = true OR (p.status = 'HIDDEN' AND p.statusReason IS NOT NULL)) "
            + "ORDER BY p.createdAt DESC")
    Page<Post> findSensitiveContentPosts(Pageable pageable);

    // Tìm bài bị admin ẩn quá 30 ngày để scheduled job xóa
    // hiddenAt dùng timezone Asia/Ho_Chi_Minh nên so sánh trực tiếp với LocalDateTime VN là đúng
    @Query("SELECT p FROM Post p WHERE p.status = 'HIDDEN' AND p.groupId IS NULL AND p.hiddenAt <= :cutoff")
    List<Post> findExpiredHiddenPosts(@Param("cutoff") LocalDateTime cutoff);

    // Lấy bài của danh sách userId (following feed hoặc friends feed) — sort theo thời gian mới nhất
    @Query("SELECT p FROM Post p WHERE p.userId IN :userIds AND p.groupId IS NULL AND (p.status IS NULL OR p.status != 'HIDDEN') ORDER BY p.createdAt DESC")
    List<Post> findByUserIdInOrderByCreatedAtDesc(@Param("userIds") List<String> userIds, Pageable pageable);
}
