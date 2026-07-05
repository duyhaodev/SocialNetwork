package com.DuyHao.interaction_service.FeignClient;

import com.DuyHao.interaction_service.dto.request.WeightUpdateRequest;
import com.DuyHao.interaction_service.dto.response.UserResponse;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "user-service", url = "${app.service.profile}")
public interface UserClient {

    @GetMapping("/internal/users/id/{id}")
    UserResponse getUser(@PathVariable String id);

    @GetMapping("/internal/users/username/{username}")
    UserResponse getUserByUsername(@PathVariable String username);

    @PostMapping("/internal/users/batch")
    List<UserResponse> getUsers(@RequestBody List<String> ids);

    @PostMapping("/internal/users/{id}/preferences/update")
    java.util.Map<String, Double> updateCategoryWeights(
            @PathVariable("id") String userId, @RequestBody WeightUpdateRequest request);

    @GetMapping("/internal/users/{userId}/block-list")
    List<String> getBlockList(@PathVariable("userId") String userId);
}
