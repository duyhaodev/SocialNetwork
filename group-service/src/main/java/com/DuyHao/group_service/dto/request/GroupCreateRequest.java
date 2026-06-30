package com.DuyHao.group_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GroupCreateRequest {
    @NotBlank(message = "Group name is required")
    String name;
    String description;
    String coverImageUrl;
    @NotBlank(message = "Privacy is required")
    String privacy; // PUBLIC or PRIVATE
    Boolean requiresApproval;
}
