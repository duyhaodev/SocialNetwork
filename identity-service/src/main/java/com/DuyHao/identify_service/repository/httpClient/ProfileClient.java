package com.DuyHao.identify_service.repository.httpClient;

import com.DuyHao.identify_service.configuration.AuthenticationRequestInterceptor;
import com.DuyHao.identify_service.dto.request.ProfileCreationRequest;
import com.DuyHao.identify_service.dto.response.UserProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "profile-service", url = "${app.service.profile}",
        configuration = { AuthenticationRequestInterceptor.class})
public interface ProfileClient {
    @PostMapping(value = "/internal/users", produces = MediaType.APPLICATION_JSON_VALUE)
    UserProfileResponse createProfile(@RequestBody ProfileCreationRequest request);
}
