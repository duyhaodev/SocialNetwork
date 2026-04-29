package com.DuyHao.profile_service.service;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.DuyHao.profile_service.dto.request.ProfileCreationRequest;
import com.DuyHao.profile_service.dto.response.UserProfileResponse;
import com.DuyHao.profile_service.entity.UserProfile;
import com.DuyHao.profile_service.mapper.UserProfileMapper;
import com.DuyHao.profile_service.repository.UserProfileRepository;
import com.DuyHao.profile_service.util.TextNormalizer;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserProfileRepositoryService {
    UserProfileRepository userProfileRepository;
    UserProfileMapper userProfileMapper;

    public UserProfileResponse createProfile(ProfileCreationRequest request) {
        var existing = userProfileRepository.findByUserId(request.getUserId());
        if (existing.isPresent()) {
            return userProfileMapper.toUserProfileResponse(existing.get());
        }
        UserProfile userProfile = userProfileMapper.toUserProfile(request);
        if (userProfile.getDob() == null) {
            userProfile.setDob(java.time.LocalDate.of(1900, 1, 1));
        }
        if (userProfile.getCity() == null || userProfile.getCity().isEmpty()) {
            userProfile.setCity("Chưa cập nhật");
        }
        if (userProfile.getAvatarUrl() == null || userProfile.getAvatarUrl().isEmpty()) {
            userProfile.setAvatarUrl("https://res.cloudinary.com/dfscz2c2l/image/upload/q_auto/f_auto/v1776620937/Gemini_Generated_Image_y5h7uy5h7uy5h7uy_s6vvqx.png");
        }
        if (userProfile.getBio() == null) {
            userProfile.setBio("");
        }
        userProfile = userProfileRepository.save(userProfile);

        return userProfileMapper.toUserProfileResponse(userProfile);
    }

    public UserProfileResponse getMyInfo() {
        var context = SecurityContextHolder.getContext();
        log.info(context.toString());
        String userId = context.getAuthentication().getName();
        log.info("UserId : {}", userId);

        UserProfile userProfile = userProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found!"));

        return userProfileMapper.toUserProfileResponse(userProfile);
    }

    public UserProfileResponse getProfile(String userId) {
        log.info("UserId : {}", userId);
        UserProfile userProfile = userProfileRepository
                .findById(userId)
                .or(() -> userProfileRepository.findByUserId(userId))
                .orElseThrow(() -> new RuntimeException("Profile not found!"));

        return userProfileMapper.toUserProfileResponse(userProfile);
    }

    public List<UserProfileResponse> getUsers(List<String> userIds) {
        var profiles = userProfileRepository.findAllByUserIdIn(userIds);
        return profiles.stream().map(userProfileMapper::toUserProfileResponse).toList();
    }

    public UserProfileResponse getByUsername(String username) {
        UserProfile userProfile = userProfileRepository
                .findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));
        return userProfileMapper.toUserProfileResponse(userProfile);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<UserProfileResponse> getAllProfiles() {
        var profiles = userProfileRepository.findAll();

        return profiles.stream().map(userProfileMapper::toUserProfileResponse).toList();
    }

    public List<UserProfileResponse> searchUsersInternal(String keyword) {
        String normalizedKeyword = TextNormalizer.normalize(keyword);
        return userProfileRepository.findAll().stream()
                .filter(p -> TextNormalizer.normalize(p.getUsername()).contains(normalizedKeyword)
                        || TextNormalizer.normalize(p.getFullName()).contains(normalizedKeyword))
                .map(userProfileMapper::toUserProfileResponse)
                .toList();
    }

    public List<UserProfileResponse> searchUsers(String keyword) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
        String normalizedKeyword = TextNormalizer.normalize(keyword);
        return userProfileRepository.findAll().stream()
                .filter(p -> !p.getUserId().equals(currentUserId))
                .filter(p -> TextNormalizer.normalize(p.getUsername()).contains(normalizedKeyword)
                        || TextNormalizer.normalize(p.getFullName()).contains(normalizedKeyword))
                .map(userProfileMapper::toUserProfileResponse)
                .toList();
    }
}
