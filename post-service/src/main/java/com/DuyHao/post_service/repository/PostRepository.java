package com.DuyHao.post_service.repository;

import com.DuyHao.post_service.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, String> {

    List<Post> findByUserIdAndRepostOfIsNullOrderByCreatedAtDesc(String userId);

    List<Post> findByUserIdAndRepostOfIsNotNullOrderByCreatedAtDesc(String userId);

    boolean existsByUserIdAndRepostOf_Id(String userId, String repostOfId);

    Optional<Post> findByUserIdAndRepostOf_Id(String userId, String repostOfId);

    void deleteByRepostOf_Id(String repostOfId);
}