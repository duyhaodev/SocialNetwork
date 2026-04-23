package com.DuyHao.interaction_service.FeignClient;

import com.DuyHao.interaction_service.dto.response.PostResponse;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "post-service", url = "${app.service.post}")
public interface PostClient {

    // Lấy thông tin 1 bài viết
    @GetMapping("/internal/posts/{id}")
    PostResponse getPost(@PathVariable("id") String id);

    // Lấy danh sách bài viết
    @GetMapping("/internal/posts")
    List<PostResponse> getPosts(@RequestParam("ids") List<String> ids);

    // Gửi yêu cầu tạo bài repost lên Profile (Đã khớp với InternalPostController)
    @PostMapping("/internal/posts/repost")
    PostResponse createRepost(@RequestParam("userId") String userId,
                              @RequestParam("originalPostId") String originalPostId);

    // Gửi yêu cầu xóa bài repost khỏi Profile
    @DeleteMapping("/internal/posts/repost")
    String deleteRepost(@RequestParam("userId") String userId,
                        @RequestParam("originalPostId") String originalPostId);
}
