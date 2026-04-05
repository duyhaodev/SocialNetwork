package com.DuyHao.interaction_service.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.DuyHao.interaction_service.dto.ApiResponse;
import com.DuyHao.interaction_service.dto.response.RepostResponse;
import com.DuyHao.interaction_service.service.RepostService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/reposts")
@RequiredArgsConstructor
public class RepostController {

    private final RepostService repostService;

    @PostMapping("/{postId}")
    public ApiResponse<RepostResponse> toggleRepost(
            @PathVariable String postId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getSubject();
        var result = repostService.toggleRepost(postId, userId);
        return ApiResponse.<RepostResponse>builder()
                .result(result)
                .build();
    }
}