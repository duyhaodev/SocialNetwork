package com.DuyHao.interaction_service.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RepostResponse {

    boolean reposted;
    long repostCount;
}