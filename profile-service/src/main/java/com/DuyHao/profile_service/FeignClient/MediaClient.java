package com.DuyHao.profile_service.FeignClient;

import com.DuyHao.profile_service.dto.response.MediaResponse;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "media-service", url = "${app.service.media}")
public interface MediaClient {

    @PutMapping("/internal/media/assign/user")
    void assignMediaToUser(@RequestParam("userId") String userId, @RequestParam("mediaId") String mediaId);

    @GetMapping("/internal/media/user/{userId}")
    List<MediaResponse> getByUserId(@PathVariable("userId") String userId);
}
