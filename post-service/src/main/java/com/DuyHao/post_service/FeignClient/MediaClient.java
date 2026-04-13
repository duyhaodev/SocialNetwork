package com.DuyHao.post_service.FeignClient;

import com.DuyHao.post_service.dto.response.MediaResponse;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "media-service", url = "${app.service.media}")
public interface MediaClient {

    // Lấy tất cả media của một post
    @GetMapping("/internal/media/post/{postId}")
    List<MediaResponse> getMediaByPostId(@PathVariable String postId);

    // Xóa tất cả media liên quan đến một post
    @DeleteMapping("/internal/media/post/{postId}")
    void deleteMediaByPostId(@PathVariable String postId);

    @PutMapping("/internal/media/assign/post")
    void assignMediaToPost(@RequestParam("postId") String postId, @RequestBody List<String> mediaIds);
}
