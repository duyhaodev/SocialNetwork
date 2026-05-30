package com.DuyHao.post_service.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TranslateResponse {

    // Kq
    private String translatedText;

    // Ngôn ngữ gốc dịch được
    private String detectedSourceLang;
}
