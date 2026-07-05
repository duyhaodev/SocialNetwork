package com.DuyHao.profile_service.entity;

import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.support.UUIDStringGenerator;

@Node("block")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Block {
    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    String id;

    String blockerId;
    String blockedId;

    @Builder.Default
    LocalDateTime createdAt = LocalDateTime.now();
}
