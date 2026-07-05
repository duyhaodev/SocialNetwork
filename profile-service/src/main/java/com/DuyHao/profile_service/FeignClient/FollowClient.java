package com.DuyHao.profile_service.FeignClient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "follow-service", url = "${app.service.follow}")
public interface FollowClient {

    @DeleteMapping("/internal/follows/remove-relation")
    void removeRelation(@RequestParam("userId1") String userId1, @RequestParam("userId2") String userId2);
}
