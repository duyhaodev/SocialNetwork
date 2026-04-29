package com.DuyHao.search_service.FeignClient;

import com.DuyHao.search_service.dto.response.PostResponse;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "post-service", url = "${app.service.post:http://localhost:8085/post}")
public interface PostClient {

    @GetMapping("/internal/posts/search")
    List<PostResponse> searchPosts(
            @RequestParam("keyword") String keyword,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size);
}
