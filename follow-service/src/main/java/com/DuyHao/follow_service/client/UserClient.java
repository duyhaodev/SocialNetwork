package com.DuyHao.follow_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

@FeignClient(name = "user-service", url = "${app.service.profile}")
public interface UserClient {

    @PostMapping("/internal/users/{id}/followers/increment")
    void incrementFollowers(@PathVariable String id);

    @PostMapping("/internal/users/{id}/followers/decrement")
    void decrementFollowers(@PathVariable String id);

    @PostMapping("/internal/users/{id}/following/increment")
    void incrementFollowing(@PathVariable String id);

    @PostMapping("/internal/users/{id}/following/decrement")
    void decrementFollowing(@PathVariable String id);
}
