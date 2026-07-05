package com.DuyHao.profile_service.service;

import com.DuyHao.profile_service.FeignClient.MediaClient;
import com.DuyHao.profile_service.dto.request.ProfileCreationRequest;
import com.DuyHao.profile_service.dto.request.ProfileUpdateRequest;
import com.DuyHao.profile_service.dto.response.UserProfileResponse;
import com.DuyHao.profile_service.entity.UserProfile;
import com.DuyHao.profile_service.mapper.UserProfileMapper;
import com.DuyHao.profile_service.repository.UserProfileRepository;
import com.DuyHao.profile_service.util.TextNormalizer;
import java.time.LocalDate;
import java.util.List;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserProfileRepositoryService {
    UserProfileRepository userProfileRepository;
    UserProfileMapper userProfileMapper;
    MediaClient mediaClient;
    com.DuyHao.profile_service.repository.BlockRepository blockRepository;
    com.DuyHao.profile_service.FeignClient.FollowClient followClient;

    public UserProfileResponse createProfile(ProfileCreationRequest request) {
        var existing = userProfileRepository.findByUserId(request.getUserId());
        if (existing.isPresent()) {
            return userProfileMapper.toUserProfileResponse(existing.get());
        }
        UserProfile userProfile = userProfileMapper.toUserProfile(request);

        userProfile.setFollowerCount(0L);
        userProfile.setFollowingCount(0L);

        if (userProfile.getDob() == null) {
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd-MM-yyyy");
            LocalDate defaultDate = LocalDate.parse("01-01-1900", formatter);
            userProfile.setDob(defaultDate);
        }
        if (userProfile.getCity() == null || userProfile.getCity().isEmpty()) {
            userProfile.setCity("Chưa cập nhật");
        }
        if (userProfile.getAvatarUrl() == null || userProfile.getAvatarUrl().isEmpty()) {
            userProfile.setAvatarUrl(
                    "https://res.cloudinary.com/dfscz2c2l/image/upload/q_auto/f_auto/v1776620937/Gemini_Generated_Image_y5h7uy5h7uy5h7uy_s6vvqx.png");
        }
        if (userProfile.getBio() == null) {
            userProfile.setBio("");
        }
        if (userProfile.getSpotifyLink() == null) {
            userProfile.setSpotifyLink("");
        }
        if (userProfile.getConnectionsPrivacy() == null) {
            userProfile.setConnectionsPrivacy("EVERYONE");
        }

        // Initialize user preferences from request
        java.util.Map<String, Double> initialWeights = new java.util.HashMap<>();
        if (request.getInterests() != null) {
            for (String tag : request.getInterests()) {
                initialWeights.put(tag, 0.5);
            }
        }
        userProfile.setCategoryWeights(initialWeights);

        userProfile = userProfileRepository.save(userProfile);

        return userProfileMapper.toUserProfileResponse(userProfile);
    }

    public UserProfileResponse getMyInfo() {
        var context = SecurityContextHolder.getContext();
        String userId = context.getAuthentication().getName();

        UserProfile userProfile = userProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found!"));

        return userProfileMapper.toUserProfileResponse(userProfile);
    }

    public UserProfileResponse getProfile(String userId) {
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

        String currentUserId =
                SecurityContextHolder.getContext().getAuthentication().getName();
        if (currentUserId != null && !currentUserId.equals("anonymousUser")) {
            List<String> blockedList = blockRepository.findInvolvedBlockIds(currentUserId);
            if (blockedList.contains(userProfile.getUserId())) {
                throw new RuntimeException("Tài khoản này không tồn tại hoặc bạn không có quyền xem");
            }
        }
        return userProfileMapper.toUserProfileResponse(userProfile);
    }

    @Transactional("transactionManager")
    public UserProfileResponse updateMyInfo(ProfileUpdateRequest request) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();

        UserProfile userProfile = userProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found!"));

        if (request.getFullName() != null) userProfile.setFullName(request.getFullName());
        if (request.getDob() != null) userProfile.setDob(request.getDob());
        if (request.getCity() != null) userProfile.setCity(request.getCity());
        if (request.getBio() != null) userProfile.setBio(request.getBio());
        if (request.getSpotifyLink() != null) userProfile.setSpotifyLink(request.getSpotifyLink());
        if (request.getConnectionsPrivacy() != null
                && List.of("EVERYONE", "FRIENDS_ONLY", "ONLY_ME").contains(request.getConnectionsPrivacy())) {
            userProfile.setConnectionsPrivacy(request.getConnectionsPrivacy());
        }
        if (request.getMediaId() != null && !request.getMediaId().isBlank()) {
            mediaClient.assignMediaToUser(userId, request.getMediaId());
            var userMedias = mediaClient.getByUserId(userId);
            if (userMedias != null && !userMedias.isEmpty()) {
                String newAvatarUrl = userMedias.get(0).getMediaUrl();
                userProfile.setAvatarUrl(newAvatarUrl);
            }
        }

        // Initialize or update selected interests/weights to 0.5
        if (request.getInterests() != null) {
            java.util.Map<String, Double> categoryWeights = userProfile.getCategoryWeights();
            if (categoryWeights == null) {
                categoryWeights = new java.util.HashMap<>();
            }
            for (String tag : request.getInterests()) {
                categoryWeights.put(tag, 0.5);
            }
            userProfile.setCategoryWeights(categoryWeights);
        }

        userProfile = userProfileRepository.save(userProfile);
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
        String currentUserId =
                SecurityContextHolder.getContext().getAuthentication().getName();
        String normalizedKeyword = TextNormalizer.normalize(keyword);
        List<String> blockedList = blockRepository.findInvolvedBlockIds(currentUserId);
        return userProfileRepository.findAll().stream()
                .filter(p -> !p.getUserId().equals(currentUserId))
                .filter(p -> !blockedList.contains(p.getUserId()))
                .filter(p -> TextNormalizer.normalize(p.getUsername()).contains(normalizedKeyword)
                        || TextNormalizer.normalize(p.getFullName()).contains(normalizedKeyword))
                .map(userProfileMapper::toUserProfileResponse)
                .toList();
    }
    // Cập nhật số lượng (Followers)
    @Transactional("transactionManager")
    public void updateFollowerCount(String userId, int delta) {
        userProfileRepository.updateFollowerCount(userId, delta);
    }

    // Cập nhật số lượng (Following)
    @Transactional("transactionManager")
    public void updateFollowingCount(String userId, int delta) {
        userProfileRepository.updateFollowingCount(userId, delta);
    }

    // Lấy top N user có follower cao nhất
    public List<UserProfileResponse> getTopFollowers(int limit) {
        return userProfileRepository.findTopByFollowerCount(limit).stream()
                .map(userProfileMapper::toUserProfileResponse)
                .toList();
    }

    public java.util.Map<String, Double> getUserPreferences(String userId) {
        UserProfile userProfile = userProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found!"));
        return userProfile.getCategoryWeights();
    }

    @Transactional("transactionManager")
    public java.util.Map<String, Double> updateCategoryWeights(String userId, List<String> tags, double delta) {
        UserProfile userProfile = userProfileRepository
                .findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found!"));

        java.util.Map<String, Double> weights = userProfile.getCategoryWeights();
        if (weights == null) {
            weights = new java.util.HashMap<>();
        }

        for (String tag : tags) {
            double currentWeight = weights.getOrDefault(tag, 0.1);
            double newWeight = currentWeight + delta;
            if (newWeight < 0.0) newWeight = 0.0;
            if (newWeight > 1.0) newWeight = 1.0;
            weights.put(tag, newWeight);
        }

        userProfile.setCategoryWeights(weights);
        userProfileRepository.save(userProfile);
        return weights;
    }

    public List<java.util.Map<String, String>> getAvailableInterests() {
        List<java.util.Map<String, String>> interests = new java.util.ArrayList<>();
        interests.add(java.util.Map.of("tag", "tech_auto", "displayName", "Technology & Vehicles / Công nghệ & Xe"));
        interests.add(java.util.Map.of("tag", "entertainment", "displayName", "Entertainment / Giải trí, Nghệ thuật"));
        interests.add(
                java.util.Map.of("tag", "travel_nature", "displayName", "Travel & Nature / Du lịch & Thiên nhiên"));
        interests.add(java.util.Map.of("tag", "food_drink", "displayName", "Food & Drink / Ẩm thực & Ăn uống"));
        interests.add(java.util.Map.of("tag", "sports", "displayName", "Sports / Thể thao & Thể hình"));
        interests.add(
                java.util.Map.of("tag", "fashion_beauty", "displayName", "Fashion & Beauty / Thời trang & Làm đẹp"));
        interests.add(java.util.Map.of("tag", "gaming", "displayName", "Gaming / Trò chơi điện tử"));
        interests.add(java.util.Map.of("tag", "education", "displayName", "Education / Giáo dục & Phát triển"));
        interests.add(java.util.Map.of("tag", "news_society", "displayName", "News & Society / Tin tức & Xã hội"));
        interests.add(java.util.Map.of("tag", "pets", "displayName", "Pets / Thú cưng & Động vật"));
        interests.add(java.util.Map.of("tag", "vibe_funny", "displayName", "Funny Vibe / Hài hước & Meme"));
        interests.add(java.util.Map.of("tag", "vibe_mood", "displayName", "Mood Vibe / Tâm trạng & Cảm xúc"));
        interests.add(java.util.Map.of("tag", "vibe_motivation", "displayName", "Motivation Vibe / Truyền cảm hứng"));
        return interests;
    }

    @Transactional("transactionManager")
    public void blockUser(String blockerId, String blockedId) {
        if (blockerId.equals(blockedId)) return;
        if (!blockRepository.existsByBlockerIdAndBlockedId(blockerId, blockedId)) {
            blockRepository.save(com.DuyHao.profile_service
                    .entity
                    .Block
                    .builder()
                    .blockerId(blockerId)
                    .blockedId(blockedId)
                    .build());

            // Xóa quan hệ follow 2 chiều
            try {
                followClient.removeRelation(blockerId, blockedId);
            } catch (Exception e) {
                log.error("Failed to remove follow relation when blocking", e);
            }
        }
    }

    @Transactional("transactionManager")
    public void unblockUser(String blockerId, String blockedId) {
        blockRepository.deleteByBlockerIdAndBlockedId(blockerId, blockedId);
    }

    public List<UserProfileResponse> getBlockedUsers(String userId) {
        List<String> blockedIds = blockRepository.findByBlockerId(userId).stream()
                .map(com.DuyHao.profile_service.entity.Block::getBlockedId)
                .toList();
        return getUsers(blockedIds);
    }

    public List<String> getInvolvedBlockIds(String userId) {
        return blockRepository.findInvolvedBlockIds(userId);
    }
}
