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
    private String id;
    private String groupType;
    private String postId;
    private String commentId;
    private int count;
    private List<ActivityUserResponse> users;
    private String message;
    private LocalDateTime createdAt;
    private boolean read;
    // Cấp group: trạng thái đã follow lại (chỉ có ý nghĩa với type "follow")
    private Boolean followed;
    // Cấp group: notification đã được "xử lý" (user nhận đã follow back trước khi noti tạo)
    // Khi true → tab All ẩn, tab Follows vẫn hiện
    private Boolean resolved;
}
