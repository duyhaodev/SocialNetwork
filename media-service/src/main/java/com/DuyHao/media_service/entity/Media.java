package com.DuyHao.media_service.entity;

import jakarta.persistence.*;
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
@Table(name = "media")
public class Media {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "media_url", nullable = false)
    String mediaUrl;

    @Column(name = "media_public_id")
    String mediaPublicId;

    @Column(name = "media_type", length = 20)
    String mediaType;

    @Column(name = "post_id")
    String postId;

    @Column(name = "comment_id")
    String commentId;

    @PrePersist
    public void prePersist() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
    }
}
