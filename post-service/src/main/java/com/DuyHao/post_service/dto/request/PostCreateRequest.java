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
    private String groupId;
    private List<String> tags;
    List<String> mediaIds;
    private Boolean isAiGenerated; // true nếu ảnh do AI tạo ra
    private Boolean isSensitiveContent; // true nếu user nhấn "Post anyway" khi bị cảnh báo mild
}
