package com.DuyHao.interaction_service.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaResponse {
    private String id;
    private String mediaUrl;
    private String mediaType;
    private String publicId;
}