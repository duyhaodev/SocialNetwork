package com.DuyHao.profile_service.dto.response;

import java.time.LocalDate;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserProfileResponse {
    String userId;
    String fullName;
    String username;
    String firstName;
    String lastName;
    LocalDate dob;
    String city;
    String avatarUrl;
    String bio;
}
