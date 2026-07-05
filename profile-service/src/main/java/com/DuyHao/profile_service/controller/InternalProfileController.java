package com.DuyHao.profile_service.controller;

import com.DuyHao.profile_service.service.UserProfileRepositoryService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/users")
@RequiredArgsConstructor
public class InternalProfileController {

    private final UserProfileRepositoryService userProfileRepositoryService;

    @GetMapping("/{userId}/block-list")
    public List<String> getInvolvedBlockIds(@PathVariable String userId) {
        return userProfileRepositoryService.getInvolvedBlockIds(userId);
    }
}
