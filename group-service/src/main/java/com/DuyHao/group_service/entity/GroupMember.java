package com.DuyHao.group_service.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "group_members", indexes = {
    @Index(name = "idx_group_user", columnList = "group_id, user_id", unique = true)
})
public class GroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "group_id", nullable = false, length = 36)
    String groupId;

    @Column(name = "user_id", nullable = false, length = 36)
    String userId;

    @Column(nullable = false, length = 20)
    String role; // ADMIN, MODERATOR, MEMBER, PENDING

    @Column(name = "joined_at")
    LocalDateTime joinedAt;

    @PrePersist
    public void prePersist() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        if (joinedAt == null) {
            joinedAt = LocalDateTime.now();
        }
    }
}
