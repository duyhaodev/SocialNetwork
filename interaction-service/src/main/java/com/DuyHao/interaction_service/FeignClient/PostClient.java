package com.DuyHao.interaction_service.FeignClient;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import com.DuyHao.interaction_service.dto.response.PostResponse;

@FeignClient(name = "post-service", url = "${app.service.post}")
public interface PostClient {

    // Lấy thông tin 1 bài viết
    @GetMapping("/internal/posts/{id}")
    PostResponse getPost(@PathVariable("id") String id);

    // Lấy danh sách bài viết
    @GetMapping("/internal/posts")
    List<PostResponse> getPosts(@RequestParam("ids") List<String> ids);
}