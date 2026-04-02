package com.DuyHao.post_service.dto.request;

import java.util.List;
import lombok.*;

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
