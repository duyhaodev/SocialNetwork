package com.DuyHao.chat_service.repository.httpClient;

import com.DuyHao.chat_service.configuration.AuthenticationRequestInterceptor;
import com.DuyHao.chat_service.dto.response.UserProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "profile-service", url = "${app.service.profile}",
        configuration = { AuthenticationRequestInterceptor.class })
public interface ProfileClient {
    @GetMapping(value = "/users/{profileId}")
    UserProfileResponse getProfile(@PathVariable("profileId") String profileId);
}
