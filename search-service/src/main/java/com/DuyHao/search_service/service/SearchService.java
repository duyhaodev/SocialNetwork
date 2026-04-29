package com.DuyHao.search_service.service;

import com.DuyHao.search_service.FeignClient.PostClient;
import com.DuyHao.search_service.FeignClient.ProfileClient;
import com.DuyHao.search_service.dto.response.PostResponse;
import com.DuyHao.search_service.dto.response.SearchResponse;
import com.DuyHao.search_service.dto.response.UserProfileResponse;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final ProfileClient profileClient;
    private final PostClient postClient;

    public SearchResponse search(String keyword, int page, int size) {
        List<UserProfileResponse> users = Collections.emptyList();
        List<PostResponse> posts = Collections.emptyList();

        try {
            users = profileClient.searchUsers(keyword);
        } catch (Exception e) {
            System.err.println("Error calling profile-service: " + e.getMessage());
        }

        try {
            posts = postClient.searchPosts(keyword, page, size);
        } catch (Exception e) {
            System.err.println("Error calling post-service: " + e.getMessage());
        }

        return SearchResponse.builder()
                .users(users)
                .posts(posts)
                .build();
    }

    public List<UserProfileResponse> searchUsers(String keyword) {
        try {
            return profileClient.searchUsers(keyword);
        } catch (Exception e) {
            System.err.println("Error calling profile-service: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    public List<PostResponse> searchPosts(String keyword, int page, int size) {
        try {
            return postClient.searchPosts(keyword, page, size);
        } catch (Exception e) {
            System.err.println("Error calling post-service: " + e.getMessage());
            return Collections.emptyList();
        }
    }
}
