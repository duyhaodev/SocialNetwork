package com.DuyHao.group_service.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GroupReportRequest {
    String targetType; // "POST" or "COMMENT"
    String targetId;
    String reason;
}
