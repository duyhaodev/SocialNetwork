package com.DuyHao.post_service.FeignClient;

import com.DuyHao.post_service.dto.response.MediaResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(name = "media-service", url = "http://localhost:8082")
public interface MediaClient {

    // Lấy tất cả media của một post
    @GetMapping("/media/post/{postId}")
    List<MediaResponse> getMediaByPostId(@PathVariable String postId);

    // Xóa tất cả media liên quan đến một post
    @DeleteMapping("/media/post/{postId}")
    void deleteMediaByPostId(@PathVariable String postId);

    @PutMapping("/internal/media/assign")
    void assignMediaToPost(
            @RequestParam("postId") String postId,
            @RequestBody List<String> mediaIds
    );
}