package com.DuyHao.media_service.repository;

import com.DuyHao.media_service.entity.Media;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MediaRepository extends JpaRepository<Media, String> {

    List<Media> findByPostId(String postId);
    List<Media> findByCommentId(String commentId);
    // Tìm danh sách media theo list ID
    List<Media> findAllByIdIn(List<String> ids);
}