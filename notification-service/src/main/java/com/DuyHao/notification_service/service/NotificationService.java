package com.DuyHao.notification_service.service;

import com.DuyHao.notification_service.client.FollowClient;
import com.DuyHao.notification_service.client.UserClient;
import com.DuyHao.notification_service.dto.ActivityGroupResponse;
import com.DuyHao.notification_service.dto.ActivityUserResponse;
import com.DuyHao.notification_service.entity.Notification;
import com.DuyHao.notification_service.mapper.NotificationMapper;
import com.DuyHao.notification_service.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepo;
    private final UserClient userClient;
    private final FollowClient followClient;

    public Notification createFollowNotification(String toUserId, String fromUserId) {

        Optional<Notification> existing =
                notificationRepo.findByUserIdAndFromUserIdAndType(
                        toUserId,
                        fromUserId,
                        "follow"
                );

        if (existing.isPresent()) {

            Notification notification = existing.get();
            notification.setCreatedAt(LocalDateTime.now());

            return notificationRepo.save(notification);
        }

        var user = userClient.getUser(fromUserId);

        Notification notification = Notification.builder()
                .userId(toUserId)
                .fromUserId(fromUserId)
                .type("follow")
                .message(user.getFullName() + " followed you")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        return notificationRepo.save(notification);
    }

    public List<ActivityGroupResponse> getGroupedActivities(String userId, List<String> types, int limit) {

        List<Notification> notifications =
                notificationRepo.findByUserIdOrderByCreatedAtDesc(userId);

        Map<String, List<Notification>> grouped =
                notifications.stream()
                        .collect(Collectors.groupingBy(n ->
                                n.getType() + "_" + (n.getPostId() != null ? n.getPostId() : "none")
                        ));

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
                                u.getId(),
                                u.getUserName(),
                                u.getFullName(),
                                u.getAvatarUrl(),
                                followed
                        );
                    })
                    .toList();

            dto.setUsers(users);

            result.add(dto);
        }

        return result.stream()
                .sorted(Comparator.comparing(ActivityGroupResponse::getCreatedAt).reversed())
                .limit(limit)
                .toList();
    }

    public long getUnreadCount(String userId) {

        return notificationRepo.countByUserIdAndIsReadFalse(userId);
    }

    public void markAsRead(String notificationId) {

        Notification notification =
                notificationRepo.findById(notificationId).orElseThrow();

        notification.setIsRead(true);

        notificationRepo.save(notification);
    }

}