package com.DuyHao.profile_service.entity;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Property;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Node("user_profile")
public class UserProfile {
    @Id
    @Property("userId")
    String userId;

    String username;
    String fullName;

    @JsonFormat(pattern = "dd-MM-yyyy")
    LocalDate dob;
    String city;
    String avatarUrl;
    String bio;
}
