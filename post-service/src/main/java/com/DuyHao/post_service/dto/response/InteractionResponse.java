package com.DuyHao.post_service.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InteractionResponse {
    private String postId;
    private Long likeCount;
    private Long commentCount;
    private Long repostCount;

    private Boolean likedByCurrentUser;
    private Boolean repostedByCurrentUser;
}
