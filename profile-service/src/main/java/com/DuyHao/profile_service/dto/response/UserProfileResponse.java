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
    String id;
    String fullName;
    String userId;
    String username;
    String firstName;
    String lastName;
    LocalDate dob;
    String city;
}
