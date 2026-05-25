package com.DuyHao.profile_service.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.util.Map;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.neo4j.core.schema.CompositeProperty;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Property;

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
    String spotifyLink;

    long followerCount;
    long followingCount;

    @Property("connectionsPrivacy")
    String connectionsPrivacy;

    @CompositeProperty(prefix = "weights")
    Map<String, Double> categoryWeights;
}
