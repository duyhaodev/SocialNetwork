package com.DuyHao.post_service.dto.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TranslateRequest {

    private String text;

    // Ngôn ngữ mặc định
    @Builder.Default
    private String targetLang = "VI";
}
