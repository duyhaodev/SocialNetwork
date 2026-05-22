package com.DuyHao.follow_service.dto;

import lombok.Data;

@Data
public class UserProfileResponse {
    String userId;
    String username;
    String fullName;
    String avatarUrl;
    String city;
    long followerCount;
    long followingCount;
    String connectionsPrivacy;
}
