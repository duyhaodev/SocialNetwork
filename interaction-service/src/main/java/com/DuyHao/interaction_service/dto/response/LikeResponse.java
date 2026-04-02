package com.DuyHao.interaction_service.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LikeResponse {

    boolean liked;
    long likeCount;
}