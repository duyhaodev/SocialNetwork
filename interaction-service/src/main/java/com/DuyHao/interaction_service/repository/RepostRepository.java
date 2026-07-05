package com.DuyHao.interaction_service.repository;

import com.DuyHao.interaction_service.entity.Repost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RepostRepository extends JpaRepository<Repost, String> {

    boolean existsByUserIdAndPostId(String userId, String postId);

    void deleteByUserIdAndPostId(String userId, String postId);

    long countByPostId(String postId);

    boolean existsByPostIdAndUserId(String postId, String userId);

    @org.springframework.data.jpa.repository.Query(
            "SELECT r.postId, COUNT(r) FROM Repost r WHERE r.postId IN :postIds GROUP BY r.postId")
    java.util.List<Object[]> countBulkByPostIds(
            @org.springframework.data.repository.query.Param("postIds") java.util.List<String> postIds);
}
