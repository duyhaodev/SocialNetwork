package com.DuyHao.post_service.FeignClient;

import com.DuyHao.post_service.dto.response.UserResponse;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "profile-service", url = "http://localhost:8081")
public interface UserClient {

    @GetMapping("/profile/users/id/{id}")
    UserResponse getUser(@PathVariable String id);

    @GetMapping("/profile/users/{username}")
    UserResponse getUserByUsername(@PathVariable String username);

    @PostMapping("/profile/users/batch")
    List<UserResponse> getUsers(@RequestBody List<String> ids);
}
