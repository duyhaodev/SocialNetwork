package com.DuyHao.profile_service.dto.request;

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
<<<<<<< HEAD
    String fullName;
=======
    String username;
    String firstName;
    String lastName;
>>>>>>> HiepKa
    LocalDate dob;
    String city;
}
