package com.DuyHao.follow_service.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SuggestionResponse {

    String userId;
    String username;
    String fullName;
    String avatarUrl;
    String city;
    long followerCount;

    // Số bạn chung
    int mutualCount;

    // avatar của bạn chung
    List<String> mutualFriendAvatars;
}
