package com.DuyHao.story_service.repository;

import com.DuyHao.story_service.entity.Story;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface StoryRepository extends JpaRepository<Story, String> {

    // Lấy stories đang active của 1 user
    List<Story> findByUserIdAndArchivedFalseAndExpiresAtAfterOrderByCreatedAtDesc( String userId, LocalDateTime now);

    // Lấy stories đã archive của 1 user
    List<Story> findByUserIdAndArchivedTrueOrderByCreatedAtDesc(String userId);

    // Lấy stories active của nhiều user (dùng cho feed)
    @Query("""
            SELECT s FROM Story s
            WHERE s.userId IN :userIds
            AND s.archived = false
            AND s.expiresAt > :now
            AND s.scope IN ('PUBLIC', 'FOLLOWERS')
            ORDER BY s.createdAt DESC
            """)
    List<Story> findFeedStories(List<String> userIds, LocalDateTime now);

    // Chuyển stories hết hạn sang archive
    @Modifying
    @Transactional
    @Query("UPDATE Story s SET s.archived = true WHERE s.expiresAt <= :now AND s.archived = false")
    void archiveExpiredStories(LocalDateTime now);
}
