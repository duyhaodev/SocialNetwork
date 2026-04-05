package com.DuyHao.interaction_service.FeignClient;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import com.DuyHao.interaction_service.dto.response.MediaResponse;

@FeignClient(name = "media-service", url = "${app.service.media}")
public interface MediaClient {

    // Lấy tất cả media của một comment
    @GetMapping("/internal/media/comment/{commentId}")
    List<MediaResponse> getMediaByCommentId(@PathVariable("commentId") String commentId);

    // Xóa tất cả media liên quan đến một comment
    @DeleteMapping("/internal/media/comment/{commentId}")
    void deleteMediaByCommentId(@PathVariable("commentId") String commentId);

    // Gán media cho comment sau khi comment được tạo thành công
    @PutMapping("/internal/media/assign/comment")
    void assignMediaToComment(@RequestParam("commentId") String commentId, @RequestBody List<String> mediaIds);

}