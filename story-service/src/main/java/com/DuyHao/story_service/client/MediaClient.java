package com.DuyHao.story_service.client;

import com.DuyHao.story_service.dto.response.MediaResponse;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

// Gọi sang media-service để lấy URL media
@FeignClient(name = "media-service", url = "${app.service.media}")
public interface MediaClient {

    // Lấy media của 1 story theo storyId
    @GetMapping("/internal/media/story/{storyId}")
    List<MediaResponse> getByStoryId(@PathVariable String storyId);

    // Gán mediaId vào storyId sau khi tạo story
    @PutMapping("/internal/media/assign/story")
    void assignMediaToStory(@RequestParam String storyId, @RequestBody List<String> mediaIds);

    // Xóa media khi story bị xóa
    @DeleteMapping("/internal/media/story/{storyId}")
    void deleteByStoryId(@PathVariable String storyId);
}
