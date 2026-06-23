package com.DuyHao.notification_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import com.DuyHao.notification_service.dto.UserResponse;

@FeignClient(name = "profile-service", url = "${app.service.profile}")
public interface UserClient {

    @GetMapping("/internal/users/id/{id}")
    UserResponse getUser(@PathVariable String id);
}
