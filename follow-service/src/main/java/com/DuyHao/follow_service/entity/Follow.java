package com.DuyHao.follow_service.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Document(collection = "follows")
public class Follow {
    @Id
    String id;

    @Field("follower_id")
    String followerId;

    @Field("following_id")
    String followingId;

    @Field("created_at")
    LocalDateTime createdAt;
}
