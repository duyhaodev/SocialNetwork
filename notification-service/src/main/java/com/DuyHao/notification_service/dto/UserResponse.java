package com.DuyHao.notification_service.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserResponse {
    // Profile-service trả về "userId", giữ alias "id" để tương thích ngược
    @JsonAlias({"userId", "id"})
    String id;

    // Profile-service trả về "username", giữ alias "userName" để tương thích ngược
    @JsonAlias({"username", "userName"})
    String userName;

    String fullName;
    String avatarUrl;
    String bio;
}
