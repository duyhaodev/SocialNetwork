package com.DuyHao.interaction_service.FeignClient;

import com.DuyHao.interaction_service.dto.response.PostResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(name = "post-service", url = "http://localhost:8080")
public interface PostClient {

    // 🔥 lấy 1 post
    @GetMapping("/internal/posts/{id}")
    PostResponse getPost(@PathVariable("id") String id);

    // 🔥 batch posts (dùng sau này tối ưu)
    @GetMapping("/internal/posts")
    List<PostResponse> getPosts(@RequestParam List<String> ids);
}