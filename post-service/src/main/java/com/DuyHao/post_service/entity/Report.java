package com.DuyHao.post_service.entity;

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
@Table(name = "reports")
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "reporter_id", nullable = false, length = 36)
    String reporterId;

    @Column(name = "target_type", nullable = false, length = 20)
    String targetType; // POST, COMMENT, USER

    @Column(name = "target_id", nullable = false, length = 36)
    String targetId;

    @Column(columnDefinition = "TEXT")
    String reason;

    @Column(length = 20)
    @Builder.Default
    String status = "PENDING"; // PENDING, RESOLVED, DISMISSED

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
