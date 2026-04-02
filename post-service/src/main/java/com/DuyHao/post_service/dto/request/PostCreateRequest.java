package com.DuyHao.post_service.dto.request;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostCreateRequest {

    private String content;
    private String scope;
    private String repostOfId;
    List<String> mediaIds;
}