package com.DuyHao.interaction_service.dto.response;

import java.util.List;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostLikersResponse {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LikerInfo {
        String userId;
        String fullName;
        String username;
        String avatarUrl;
    }

    List<LikerInfo> likers;
    long othersCount;
}
