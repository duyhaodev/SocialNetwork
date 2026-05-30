package com.DuyHao.search_service.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
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

    @JsonFormat(pattern = "dd-MM-yyyy")
    LocalDate dob;

    String city;
    String avatarUrl;
    String bio;
}
