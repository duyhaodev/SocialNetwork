package com.DuyHao.group_service.dto.response;

import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GroupResponse {
    String id;
    String name;
    String description;
    String coverImageUrl;
    String privacy;
    Boolean requiresApproval;
    LocalDateTime createdAt;
    String currentUserRole;
}
