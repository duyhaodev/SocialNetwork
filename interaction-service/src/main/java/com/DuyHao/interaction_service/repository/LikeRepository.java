package com.DuyHao.interaction_service.repository;

import com.DuyHao.interaction_service.entity.Like;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LikeRepository extends JpaRepository<Like, String> {

    boolean existsByUserIdAndPostId(String userId, String postId);

    boolean existsByUserIdAndCommentId(String userId, String commentId);

    long countByPostId(String postId);

    long countByCommentId(String commentId);

    boolean existsByPostIdAndUserId(String postId, String userId);

    Optional<Like> findByUserIdAndPostId(String userId, String postId);

    Optional<Like> findByUserIdAndCommentId(String userId, String commentId);

    void deleteByUserIdAndPostId(String userId, String postId);

    void deleteByUserIdAndCommentId(String userId, String commentId);

    // Lấy danh sách userId đã like bài viết, sắp xếp mới nhất, giới hạn số lượng
    @Query("SELECT l.userId FROM Like l WHERE l.postId = :postId AND l.commentId IS NULL ORDER BY l.createdAt DESC")
    List<String> findUserIdsByPostId(@Param("postId") String postId, Pageable pageable);
}
