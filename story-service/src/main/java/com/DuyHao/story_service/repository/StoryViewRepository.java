package com.DuyHao.story_service.repository;

import com.DuyHao.story_service.entity.StoryView;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StoryViewRepository extends JpaRepository<StoryView, String> {

    // Đếm tổng lượt xem của 1 story
    long countByStoryId(String storyId);

    // Kiểm tra viewer đã xem story này chưa
    boolean existsByStoryIdAndViewerId(String storyId, String viewerId);

    // Lấy danh sách người đã xem
    List<StoryView> findByStoryIdOrderByViewedAtDesc(String storyId);
}
