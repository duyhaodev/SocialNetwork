package com.DuyHao.interaction_service.FeignClient;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import com.DuyHao.interaction_service.dto.response.MediaResponse;

@FeignClient(name = "media-service")
public interface MediaClient {

    @GetMapping("/internal/media/{id}")
    MediaResponse getMediaById(@PathVariable String id);

    @PostMapping("/internal/media/batch")
    List<MediaResponse> getMediaByIds(@RequestBody List<String> ids);

    @DeleteMapping("/internal/media/{id}")
    void deleteMedia(@PathVariable String id);
}
