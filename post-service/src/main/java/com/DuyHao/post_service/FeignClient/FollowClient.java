package com.DuyHao.post_service.FeignClient;

import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "follow-service", url = "${app.service.follow}")
public interface FollowClient {

    @GetMapping("/internal/follow/following/{userId}")
    List<String> getFollowingIds(@PathVariable("userId") String userId);

    @GetMapping("/internal/follow/friends/{userId}")
    List<String> getFriendIds(@PathVariable("userId") String userId);
}
