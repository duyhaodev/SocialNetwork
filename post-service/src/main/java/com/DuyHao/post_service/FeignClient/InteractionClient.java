package com.DuyHao.post_service.FeignClient;

import com.DuyHao.post_service.dto.response.InteractionResponse;
import com.DuyHao.post_service.configuration.AuthenticationRequestInterceptor;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "interaction-service", url = "${app.service.interaction}", configuration = AuthenticationRequestInterceptor.class)
public interface InteractionClient {

    @GetMapping("/internal/interactions/{postId}")
    InteractionResponse getInteraction(@PathVariable String postId);

    @GetMapping("/internal/interactions")
    List<InteractionResponse> getInteractions(@RequestParam List<String> postIds);
}