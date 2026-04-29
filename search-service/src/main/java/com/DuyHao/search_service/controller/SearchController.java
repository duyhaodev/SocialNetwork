package com.DuyHao.search_service.controller;

import com.DuyHao.search_service.dto.ApiResponse;
import com.DuyHao.search_service.dto.response.PostResponse;
import com.DuyHao.search_service.dto.response.SearchResponse;
import com.DuyHao.search_service.dto.response.UserProfileResponse;
import com.DuyHao.search_service.service.SearchService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping("/all")
    public ApiResponse<SearchResponse> search(
            @RequestParam("keyword") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        SearchResponse result = searchService.search(keyword, page, size);
        return ApiResponse.<SearchResponse>builder()
                .code(200)
                .message("Search results")
                .result(result)
                .build();
    }

    @GetMapping("/users")
    public ApiResponse<List<UserProfileResponse>> searchUsers(@RequestParam("keyword") String keyword) {
        List<UserProfileResponse> users = searchService.searchUsers(keyword);
        return ApiResponse.<List<UserProfileResponse>>builder()
                .code(200)
                .message("User search results")
                .result(users)
                .build();
    }

    @GetMapping("/posts")
    public ApiResponse<List<PostResponse>> searchPosts(
            @RequestParam("keyword") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<PostResponse> posts = searchService.searchPosts(keyword, page, size);
        return ApiResponse.<List<PostResponse>>builder()
                .code(200)
                .message("Post search results")
                .result(posts)
                .build();
    }
}
