package com.DuyHao.group_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GroupRuleDto {
    String id;
    String groupId;
    String title;
    String description;
    Integer orderIndex;
    LocalDateTime createdAt;
}
