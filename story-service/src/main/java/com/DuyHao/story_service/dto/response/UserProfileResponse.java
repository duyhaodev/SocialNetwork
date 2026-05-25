package com.DuyHao.story_service.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileResponse {
    private String userId;
    private String username;
    private String fullName;
    private String avatarUrl;
}
