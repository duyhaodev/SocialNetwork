package com.DuyHao.post_service.FeignClient;

import com.DuyHao.post_service.dto.response.UserResponse;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "profile-service", url = "${app.service.profile}")
public interface UserClient {

    @GetMapping("/internal/users/id/{id}")
    UserResponse getUser(@PathVariable String id);

    @GetMapping("/internal/users/{username}")
    UserResponse getUserByUsername(@PathVariable String username);

    @PostMapping("/internal/users/batch")
    List<UserResponse> getUsers(@RequestBody List<String> ids);
}
