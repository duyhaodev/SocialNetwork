package com.DuyHao.identify_service.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;
    String username;
    String email;
    String password;
    String fullName;


    @ManyToMany
    Set<Role> roles;

    String verification_code;

    boolean enabled = false;

    Integer verification_attempts = 0;

    LocalDateTime otp_expiry_time;
}
