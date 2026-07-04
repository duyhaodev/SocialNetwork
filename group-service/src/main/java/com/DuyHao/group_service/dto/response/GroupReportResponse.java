package com.DuyHao.group_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GroupReportResponse {
    String id;
    String groupId;
    String reporterId;
    String targetType;
    String targetId;
    String reason;
    String status;
    LocalDateTime createdAt;
}
