package com.DuyHao.group_service.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Table(name = "group_reports")
public class GroupReport {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;
    
    @Column(name = "group_id", nullable = false)
    String groupId;
    
    @Column(name = "reporter_id", nullable = false)
    String reporterId;
    
    @Column(name = "target_type", nullable = false)
    String targetType; // "POST" or "COMMENT"
    
    @Column(name = "target_id", nullable = false)
    String targetId; // postId or commentId
    
    @Column(length = 500)
    String reason;
    
    @Column(nullable = false)
    String status; // "PENDING", "RESOLVED", "DISMISSED"
    
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "PENDING";
        }
    }
}
