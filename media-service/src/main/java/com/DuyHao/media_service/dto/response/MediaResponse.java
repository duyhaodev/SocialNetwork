package com.DuyHao.media_service.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaResponse {

    private String id;
    private String mediaUrl;
    private String mediaPublicId;
    private String mediaType;

    private String postId;
    private String commentId;
}
