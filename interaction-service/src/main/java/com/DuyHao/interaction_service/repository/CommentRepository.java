package com.DuyHao.interaction_service.repository;

import com.DuyHao.interaction_service.entity.Comment;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, String> {

    // Lấy những comment gốc của bài Post
    Page<Comment> findByPostIdAndParentIdIsNullOrderByCreatedAtDesc(String postId, Pageable pageable);

    // Lấy tất cả replies trong cây theo rootCommentId
    List<Comment> findByRootCommentIdOrderByCreatedAtAsc(String rootCommentId);

    long countByPostId(String postId);

    long countByParentId(String parentId);

    // Xóa tất cả comments của 1 bài post (dùng khi xóa post)
    void deleteByPostId(String postId);

    // Xóa toàn bộ thread replies khi xóa comment gốc
    void deleteByRootCommentId(String rootCommentId);

    @org.springframework.data.jpa.repository.Query(
            "SELECT c.postId, COUNT(c) FROM Comment c WHERE c.postId IN :postIds GROUP BY c.postId")
    List<Object[]> countBulkByPostIds(@org.springframework.data.repository.query.Param("postIds") List<String> postIds);
}
