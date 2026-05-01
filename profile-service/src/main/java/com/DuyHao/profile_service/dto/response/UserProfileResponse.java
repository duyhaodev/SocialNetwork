package com.DuyHao.profile_service.dto.response;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;
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

    @JsonFormat(pattern = "dd-MM-yyyy")
    LocalDate dob;
    String city;
    String avatarUrl;
    String bio;
}
