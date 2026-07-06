package com.DuyHao.post_service.dto.response;

import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReportResponse {
    String id;
    String reporterId;
    String targetType;
    String targetId;
    String reason;
    String status;
    LocalDateTime createdAt;
}
