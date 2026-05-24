package com.DuyHao.notification_service.service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.DuyHao.notification_service.client.FollowClient;
import com.DuyHao.notification_service.client.UserClient;
import com.DuyHao.notification_service.dto.ActivityGroupResponse;
import com.DuyHao.notification_service.dto.ActivityUserResponse;
import com.DuyHao.notification_service.dto.RealtimeMessage;
import com.DuyHao.notification_service.dto.UserResponse;
import com.DuyHao.notification_service.entity.Notification;
import com.DuyHao.notification_service.mapper.NotificationMapper;
import com.DuyHao.notification_service.repository.NotificationRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepo;
    private final UserClient userClient;
    private final FollowClient followClient;
    private final RedisPublisherService redisPublisherService;

    public Notification createFollowNotification(String toUserId, String fromUserId) {
        if (Objects.equals(toUserId, fromUserId)) return null;

        Optional<Notification> existing =
                notificationRepo.findByUserIdAndFromUserIdAndType(toUserId, fromUserId, "follow");

        Notification notification;
        if (existing.isPresent()) {
            notification = existing.get();
            notification.setCreatedAt(LocalDateTime.now());
            notification.setIsRead(false);
            notification = notificationRepo.save(notification);
        } else {
            notification = notificationRepo.save(buildNotification(toUserId, fromUserId, "follow", null, null));
        }

        pushRealtime(notification, "new_notification");
        return notification;
    }

    public Notification createLikePostNotification(String toUserId, String fromUserId, String postId) {
        return createPostNotification(toUserId, fromUserId, postId, "like_post");
    }

    public Notification createRepostNotification(String toUserId, String fromUserId, String postId) {
        return createPostNotification(toUserId, fromUserId, postId, "repost");
    }

    public Notification createCommentNotification(String toUserId, String fromUserId, String commentId, String postId) {
        if (Objects.equals(toUserId, fromUserId)) return null;

        Notification notification = notificationRepo
                .findByUserIdAndFromUserIdAndTypeAndCommentId(toUserId, fromUserId, "comment_post", commentId)
                .map(n -> {
                    n.setCreatedAt(LocalDateTime.now());
                    n.setIsRead(false);
                    return notificationRepo.save(n);
                })
                .orElseGet(() -> notificationRepo.save(
                        buildNotification(toUserId, fromUserId, "comment_post", postId, commentId)));

        pushRealtime(notification, "new_notification");
        return notification;
    }

    public Notification createReplyNotification(String toUserId, String fromUserId, String commentId, String postId) {
        if (Objects.equals(toUserId, fromUserId)) return null;

        Notification notification = notificationRepo
                .findByUserIdAndFromUserIdAndTypeAndCommentId(toUserId, fromUserId, "reply_comment", commentId)
                .map(n -> {
                    n.setCreatedAt(LocalDateTime.now());
                    n.setIsRead(false);
                    return notificationRepo.save(n);
                })
                .orElseGet(() -> notificationRepo.save(
                        buildNotification(toUserId, fromUserId, "reply_comment", postId, commentId)));

        pushRealtime(notification, "new_notification");
        return notification;
    }

    public Notification createLikeCommentNotification(
            String toUserId, String fromUserId, String commentId, String postId) {
        if (Objects.equals(toUserId, fromUserId)) return null;

        Notification notification = notificationRepo
                .findByUserIdAndFromUserIdAndTypeAndCommentId(toUserId, fromUserId, "like_comment", commentId)
                .map(n -> {
                    n.setCreatedAt(LocalDateTime.now());
                    n.setIsRead(false);
                    return notificationRepo.save(n);
                })
                .orElseGet(() -> notificationRepo.save(
                        buildNotification(toUserId, fromUserId, "like_comment", postId, commentId)));

        pushRealtime(notification, "new_notification");
        return notification;
    }

    private Notification createPostNotification(String toUserId, String fromUserId, String postId, String type) {
        if (Objects.equals(toUserId, fromUserId)) return null;

        Notification notification = notificationRepo
                .findByUserIdAndFromUserIdAndTypeAndPostId(toUserId, fromUserId, type, postId)
                .map(n -> {
                    n.setCreatedAt(LocalDateTime.now());
                    n.setIsRead(false);
                    return notificationRepo.save(n);
                })
                .orElseGet(() -> notificationRepo.save(buildNotification(toUserId, fromUserId, type, postId, null)));

        pushRealtime(notification, "new_notification");
        return notification;
    }

    private Notification buildNotification(
            String toUserId, String fromUserId, String type, String postId, String commentId) {
        return Notification.builder()
                .userId(toUserId)
                .fromUserId(fromUserId)
                .type(type)
                .postId(postId)
                .commentId(commentId)
                .message(NotificationMapper.buildMessage(type))
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
    }

    // DELETE NOTIFICATIONS (gỡ thông báo khi user hủy hành động)
    public void deleteFollowNotification(String toUserId, String fromUserId) {
        notificationRepo
                .findByUserIdAndFromUserIdAndType(toUserId, fromUserId, "follow")
                .ifPresent(n -> {
                    notificationRepo.delete(n);
                    pushRemoveRealtime(toUserId, n.getId());
                });
    }

    /**
     * Đánh dấu notification follow đã "xử lý xong" — gọi khi toUserId follow back fromUserId.
     * Notification vẫn còn trong DB → vẫn hiện ở tab Follows, chỉ ẩn ở tab All.
     */
    public void markFollowResolved(String toUserId, String fromUserId) {
        notificationRepo
                .findByUserIdAndFromUserIdAndType(toUserId, fromUserId, "follow")
                .ifPresent(n -> {
                    n.setResolved(true);
                    notificationRepo.save(n);
                    // Push event "resolve" — FE chỉ update field resolved, KHÔNG xóa item
                    pushResolveRealtime(toUserId, n.getId());
                });
    }

    private void pushResolveRealtime(String toUserId, String notificationId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("id", notificationId);
            payload.put("resolved", true);
            payload.put("followed", true);

            RealtimeMessage rt = RealtimeMessage.builder()
                    .toUserId(toUserId)
                    .type("resolve_notification")
                    .payload(payload)
                    .build();

            redisPublisherService.publish(rt);
        } catch (Exception e) {
            log.error("Failed to push resolve_notification: {}", e.getMessage());
        }
    }

    public void deleteLikePostNotification(String toUserId, String fromUserId, String postId) {
        deletePostNotification(toUserId, fromUserId, postId, "like_post");
    }

    public void deleteRepostNotification(String toUserId, String fromUserId, String postId) {
        deletePostNotification(toUserId, fromUserId, postId, "repost");
    }

    public void deleteLikeCommentNotification(String toUserId, String fromUserId, String commentId) {
        notificationRepo
                .findByUserIdAndFromUserIdAndTypeAndCommentId(toUserId, fromUserId, "like_comment", commentId)
                .ifPresent(n -> {
                    notificationRepo.delete(n);
                    pushRemoveRealtime(toUserId, n.getId());
                });
    }

    public void deleteNotificationsForComment(String commentId) {
        // Khi xóa comment, gỡ luôn các notification "comment_post", "reply_comment", "like_comment"
        // liên quan đến comment đó (cho bất kỳ recipient nào).
        List<Notification> toDelete = new ArrayList<>();
        toDelete.addAll(notificationRepo.findAllByTypeAndCommentId("comment_post", commentId));
        toDelete.addAll(notificationRepo.findAllByTypeAndCommentId("reply_comment", commentId));
        toDelete.addAll(notificationRepo.findAllByTypeAndCommentId("like_comment", commentId));

        for (Notification n : toDelete) {
            notificationRepo.delete(n);
            pushRemoveRealtime(n.getUserId(), n.getId());
        }
    }

    private void deletePostNotification(String toUserId, String fromUserId, String postId, String type) {
        notificationRepo
                .findByUserIdAndFromUserIdAndTypeAndPostId(toUserId, fromUserId, type, postId)
                .ifPresent(n -> {
                    notificationRepo.delete(n);
                    pushRemoveRealtime(toUserId, n.getId());
                });
    }

    private void pushRealtime(Notification notification, String event) {
        try {
            UserResponse fromUser = userClient.getUser(notification.getFromUserId());
            boolean followed = false;
            if ("follow".equals(notification.getType())) {
                followed = followClient.isFollowing(notification.getUserId(), notification.getFromUserId());
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("id", notification.getId());
            payload.put("type", notification.getType());
            payload.put("groupType", notification.getType());
            payload.put("postId", notification.getPostId());
            payload.put("commentId", notification.getCommentId());
            payload.put("message", notification.getMessage());
            payload.put("timestamp", notification.getCreatedAt());
            payload.put("createdAt", notification.getCreatedAt());
            payload.put("read", Boolean.FALSE.equals(notification.getIsRead()) ? false : true);
            payload.put("count", 1);
            payload.put("followed", followed);

            ActivityUserResponse userDto = new ActivityUserResponse(
                    fromUser.getId(),
                    fromUser.getUserName(),
                    fromUser.getFullName(),
                    fromUser.getAvatarUrl(),
                    followed);
            payload.put("user", userDto);
            payload.put("users", List.of(userDto));

            RealtimeMessage rt = RealtimeMessage.builder()
                    .toUserId(notification.getUserId())
                    .type(event)
                    .payload(payload)
                    .build();

            redisPublisherService.publish(rt);
        } catch (Exception e) {
            log.error("Failed to push realtime notification: {}", e.getMessage());
        }
    }

    private void pushRemoveRealtime(String toUserId, String notificationId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("id", notificationId);

            RealtimeMessage rt = RealtimeMessage.builder()
                    .toUserId(toUserId)
                    .type("remove_notification")
                    .payload(payload)
                    .build();

            redisPublisherService.publish(rt);
        } catch (Exception e) {
            log.error("Failed to push remove_notification: {}", e.getMessage());
        }
    }

    public List<ActivityGroupResponse> getGroupedActivities(String userId, List<String> types, int limit) {

        List<Notification> notifications = notificationRepo.findByUserIdOrderByCreatedAtDesc(userId);

        if (types != null && !types.isEmpty()) {
            notifications = notifications.stream()
                    .filter(n -> types.contains(n.getType()))
                    .toList();
        }

        // Quy tắc gộp:
        //  - follow:        KHÔNG gộp → mỗi notification 1 group (key duy nhất)
        //  - comment_post:  gộp theo postId (nhiều người comment cùng 1 post)
        //  - reply_comment: gộp theo commentId (parent comment được reply)
        //  - like_post:     gộp theo postId
        //  - like_comment:  gộp theo commentId
        //  - repost:        gộp theo postId
        Map<String, List<Notification>> grouped = notifications.stream().collect(Collectors.groupingBy(n -> {
            String type = n.getType();
            if ("follow".equals(type)) {
                return "follow_" + n.getId();
            }
            if ("comment_post".equals(type) || "like_post".equals(type) || "repost".equals(type)) {
                return type + "_post_" + (n.getPostId() != null ? n.getPostId() : "none");
            }
            if ("reply_comment".equals(type) || "like_comment".equals(type)) {
                return type + "_comment_" + (n.getCommentId() != null ? n.getCommentId() : "none");
            }
            return type + "_" + (n.getPostId() != null ? n.getPostId() : "none") + "_"
                    + (n.getCommentId() != null ? n.getCommentId() : "none");
        }));

        List<ActivityGroupResponse> result = new ArrayList<>();

        for (List<Notification> group : grouped.values()) {

            ActivityGroupResponse dto = NotificationMapper.toGroup(group);

            List<ActivityUserResponse> users = group.stream()
                    .map(Notification::getFromUserId)
                    .distinct()
                    .map(uid -> {
                        var u = userClient.getUser(uid);

                        boolean followed = false;

                        if ("follow".equals(group.get(0).getType())) {
                            followed = followClient.isFollowing(userId, uid);
                        }

                        return new ActivityUserResponse(
                                u.getId(), u.getUserName(), u.getFullName(), u.getAvatarUrl(), followed);
                    })
                    .toList();

            dto.setUsers(users);

            // Lift "followed" lên group level cho FE đọc dễ (chỉ áp dụng follow notification)
            if ("follow".equals(group.get(0).getType()) && !users.isEmpty()) {
                dto.setFollowed(users.get(0).getFollowed());
            }

            result.add(dto);
        }

        return result.stream()
                .sorted(Comparator.comparing(ActivityGroupResponse::getCreatedAt)
                        .reversed())
                .limit(limit)
                .toList();
    }

    public long getUnreadCount(String userId) {

        return notificationRepo.countByUserIdAndIsReadFalse(userId);
    }

    public void markAsRead(String notificationId) {

        Notification notification = notificationRepo.findById(notificationId).orElseThrow();

        notification.setIsRead(true);

        notificationRepo.save(notification);
    }

    public void markAllAsRead(String userId) {
        List<Notification> list = notificationRepo.findByUserIdOrderByCreatedAtDesc(userId);
        list.forEach(n -> n.setIsRead(true));
        notificationRepo.saveAll(list);
    }
}
