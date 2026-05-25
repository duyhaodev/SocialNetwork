package com.DuyHao.story_service.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(
        name = "story_views",
        // Mỗi user tính xem 1 lần mỗi story
        uniqueConstraints = @UniqueConstraint(columnNames = {"story_id", "viewer_id"}),
        indexes = @Index(name = "idx_view_story_id", columnList = "story_id"))
public class StoryView {

    @Id
    @Column(length = 36)
    String id;

    @Column(name = "story_id", nullable = false, length = 36)
    String storyId;

    @Column(name = "viewer_id", nullable = false, length = 36)
    String viewerId;

    @Column(name = "viewed_at")
    LocalDateTime viewedAt;

    @PrePersist
    public void prePersist() {
        if (id == null || id.isBlank()) {
            id = java.util.UUID.randomUUID().toString();
        }
        viewedAt = LocalDateTime.now();
    }
}
