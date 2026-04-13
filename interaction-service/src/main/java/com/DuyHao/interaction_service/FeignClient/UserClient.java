package com.DuyHao.interaction_service.FeignClient;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.DuyHao.interaction_service.dto.response.UserResponse;

@FeignClient(name = "user-service", url = "${app.service.profile}")
public interface UserClient {

    @GetMapping("/internal/users/id/{id}")
    UserResponse getUser(@PathVariable String id);

    @GetMapping("/internal/users/username/{username}")
    UserResponse getUserByUsername(@PathVariable String username);

    @PostMapping("/internal/users/batch")
    List<UserResponse> getUsers(@RequestBody List<String> ids);
}
