package com.DuyHao.post_service.dto.response;

import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendedFeedResponse {
    private List<PostResponse> posts;

    // refreshed = true khi user lướt hết 100 bài, backend tính lại feed mới
    // FE dùng flag này để hiện divider "--- Bài mới cho bạn ---"
    private boolean refreshed;
}
