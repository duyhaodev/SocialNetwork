package com.DuyHao.interaction_service.FeignClient;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import com.DuyHao.interaction_service.dto.response.CommentResponse;

@FeignClient(name = "interaction-service", url = "http://localhost:8083")
public interface CommentClient {

    @GetMapping("/internal/comments/{id}")
    CommentResponse getComment(@PathVariable("id") String id);

    @GetMapping("/internal/comments")
    List<CommentResponse> getComments(@RequestParam List<String> ids);
}
