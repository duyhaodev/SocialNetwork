package com.DuyHao.follow_service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FollowResponse {
    boolean success;

    @JsonProperty("isFollowing")
    boolean isFollowing;

    @JsonProperty("isFriend")
    boolean isFriend;

    String message;
}
