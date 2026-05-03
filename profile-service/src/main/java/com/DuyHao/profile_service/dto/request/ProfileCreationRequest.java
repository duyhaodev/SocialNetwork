package com.DuyHao.profile_service.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProfileCreationRequest {
    String userId;
    String fullName;
    String username;

    @JsonFormat(pattern = "dd-MM-yyyy")
    LocalDate dob;

    String city;
    String avatarUrl;
    String bio;
    String spotifyLink;
}
