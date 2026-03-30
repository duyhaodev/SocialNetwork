package com.DuyHao.notification_service.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActivityGroupResponse {
    private String groupType;
    private String postId;
    private int count;
    private List<ActivityUserResponse> users;
    private String message;
    private LocalDateTime createdAt;
    private boolean read;
}
