package com.DuyHao.post_service.controller;

import com.DuyHao.post_service.dto.response.PostResponse;
import com.DuyHao.post_service.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/internal/posts")
@RequiredArgsConstructor
public class InternalPostController {

    private final PostService postService;

    @GetMapping("/{id}")
    public PostResponse getPost(@PathVariable String id) {
        return postService.getPostById(id, null);
    }

    @GetMapping
    public List<PostResponse> getPosts(@RequestParam List<String> ids) {
        return postService.getPostsByIds(ids);
    }
}