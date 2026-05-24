package com.DuyHao.notification_service.mapper;

import java.util.List;

import com.DuyHao.notification_service.dto.ActivityGroupResponse;
import com.DuyHao.notification_service.entity.Notification;

public class NotificationMapper {
    public static ActivityGroupResponse toGroup(List<Notification> group) {
        Notification latest = group.get(0);

        return new ActivityGroupResponse(
                latest.getId(),
                latest.getType(),
                latest.getPostId(),
                latest.getCommentId(),
                group.size(),
                List.of(),
                buildMessage(latest.getType()),
                latest.getCreatedAt(),
                group.stream().anyMatch(n -> !n.getIsRead()),
                null,
                Boolean.TRUE.equals(latest.getResolved()));
    }

    public static String buildMessage(String type) {
        return switch (type) {
            case "like_post" -> "liked your thread";
            case "like_comment" -> "liked your comment";
            case "comment_post" -> "commented on your thread";
            case "reply_comment" -> "replied to your comment";
            case "repost" -> "reposted your thread";
            case "follow" -> "followed you";
            default -> "did something";
        };
    }
}
