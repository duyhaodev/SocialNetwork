package com.DuyHao.interaction_service.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InteractionResponse {
    long likeCount;
    long commentCount;
    long repostCount;
    boolean likedByCurrentUser;
    boolean repostedByCurrentUser;
}