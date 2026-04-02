package com.DuyHao.interaction_service.FeignClient;

import com.DuyHao.interaction_service.dto.response.CommentResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(name = "interaction-service", url = "http://localhost:8083")
public interface CommentClient {

    @GetMapping("/internal/comments/{id}")
    CommentResponse getComment(@PathVariable("id") String id);

    @GetMapping("/internal/comments")
    List<CommentResponse> getComments(@RequestParam List<String> ids);
}