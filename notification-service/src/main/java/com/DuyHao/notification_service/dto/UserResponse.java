package com.DuyHao.notification_service.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserResponse {
    String id;
    String userName;
    String fullName;
    String profileLink;
    String email;
    String avatarUrl;
    String bio;
    int followersCount;
    int followingCount;
    boolean enabled;
    Integer verificationAttempts;
}
