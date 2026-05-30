package com.DuyHao.post_service.dto.response;

import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocalFeedResponse {
    private List<PostResponse> posts;
    private boolean isFallback; // isFallback = true tỉnh chưa có bài lấy feed bth thay thế
    private String city;
}
