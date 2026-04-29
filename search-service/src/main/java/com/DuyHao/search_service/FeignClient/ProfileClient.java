package com.DuyHao.search_service.FeignClient;

import com.DuyHao.search_service.dto.response.UserProfileResponse;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "profile-service", url = "${app.service.profile:http://localhost:8081/profile}")
public interface ProfileClient {

    @GetMapping("/internal/users/search")
    List<UserProfileResponse> searchUsers(@RequestParam("keyword") String keyword);
}
