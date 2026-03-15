package com.DuyHao.notification_service.repository;

import com.DuyHao.notification_service.entity.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    boolean existsByIdAndUserId(String notificationId, String userId);

    Optional<Notification> findByUserIdAndFromUserIdAndType(
            String userId,
            String fromUserId,
            String type
    );

    Optional<Notification> findByUserIdAndFromUserIdAndTypeAndPostId(
            String userId,
            String fromUserId,
            String type,
            String postId
    );

    Optional<Notification> findByUserIdAndFromUserIdAndTypeAndCommentId(
            String userId,
            String fromUserId,
            String type,
            String commentId
    );

    long countByUserIdAndIsReadFalse(String userId);

}