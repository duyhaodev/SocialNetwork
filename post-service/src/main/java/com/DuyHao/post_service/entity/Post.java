package com.DuyHao.post_service.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(
        name = "posts",
        indexes = {
            @Index(name = "idx_user_created", columnList = "user_id, created_at"),
            @Index(name = "idx_repost_of", columnList = "repost_of_id"),
            @Index(name = "idx_city_created", columnList = "city, created_at")
        })
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "user_id", nullable = false, length = 36)
    String userId;

    @Column(columnDefinition = "TEXT")
    String content;

    @Column(length = 20)
    String scope;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    List<String> tags;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @Column(length = 100)
    String city;

    @Column(name = "is_ai_generated")
    Boolean isAiGenerated; // true nếu bài đăng chứa ảnh do AI tạo ra

    // Repost
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repost_of_id")
    Post repostOf;

    @PrePersist
    public void prePersist() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
