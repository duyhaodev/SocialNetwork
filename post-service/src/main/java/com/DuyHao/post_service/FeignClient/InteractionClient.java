package com.DuyHao.post_service.FeignClient;

import com.DuyHao.post_service.dto.response.InteractionResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@FeignClient(name = "interaction-service", url = "http://localhost:8084")
public interface InteractionClient {

    @GetMapping("/internal/interactions/{postId}")
    InteractionResponse getInteraction(
            @PathVariable String postId,
            @RequestParam String userId
    );

    @GetMapping("/internal/interactions")
    List<InteractionResponse> getInteractions(
            @RequestParam List<String> postIds,
            @RequestParam String userId
    );
}