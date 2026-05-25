package com.DuyHao.story_service.dto.response;

import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StoryViewResponse {

    String viewerId;
    String username;
    String fullName;
    String avatarUrl;
    LocalDateTime viewedAt;
}
