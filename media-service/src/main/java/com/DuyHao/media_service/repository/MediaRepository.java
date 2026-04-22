package com.DuyHao.media_service.repository;

import com.DuyHao.media_service.entity.Media;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MediaRepository extends JpaRepository<Media, String> {

    List<Media> findByPostId(String postId);

    List<Media> findByCommentId(String commentId);

    List<Media> findByConversationId(String conversationId);

    // Tìm danh sách media theo list ID
    List<Media> findAllByIdIn(List<String> ids);
}
