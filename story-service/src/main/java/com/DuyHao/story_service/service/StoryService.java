package com.DuyHao.story_service.service;

import com.DuyHao.story_service.client.FollowClient;
import com.DuyHao.story_service.client.MediaClient;
import com.DuyHao.story_service.client.ProfileClient;
import com.DuyHao.story_service.dto.request.StoryCreateRequest;
import com.DuyHao.story_service.dto.response.MediaResponse;
import com.DuyHao.story_service.dto.response.StoryResponse;
import com.DuyHao.story_service.dto.response.StoryViewResponse;
import com.DuyHao.story_service.dto.response.UserProfileResponse;
import com.DuyHao.story_service.entity.Story;
import com.DuyHao.story_service.entity.StoryView;
import com.DuyHao.story_service.mapper.StoryMapper;
import com.DuyHao.story_service.repository.StoryRepository;
import com.DuyHao.story_service.repository.StoryViewRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StoryService {

    private final StoryRepository storyRepository;
    private final StoryViewRepository storyViewRepository;
    private final ProfileClient profileClient;
    private final FollowClient followClient;
    private final MediaClient mediaClient;
    private final StoryMapper storyMapper;

    // ==================== TẠO STORY ====================
    @Transactional
    public StoryResponse createStory(String userId, StoryCreateRequest request) {
        // Chỉ hỗ trợ IMAGE và TEXT
        if ("VIDEO".equalsIgnoreCase(request.getMediaType())) {
            throw new RuntimeException("Video story is not supported");
        }

        Story story = Story.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .mediaType(request.getMediaType())
                .mediaId(request.getMediaId())
                .textContent(request.getTextContent())
                .backgroundColor(request.getBackgroundColor())
                .musicTitle(request.getMusicTitle())
                .musicArtist(request.getMusicArtist())
                .musicAlbumArt(request.getMusicAlbumArt())
                .musicPreviewUrl(request.getMusicPreviewUrl())
                .musicStartMs(request.getMusicStartMs())
                .scope(request.getScope() != null ? request.getScope() : "PUBLIC")
                .build();

        story = storyRepository.save(story);

        // Gán mediaId vào story trong media-service
        if (request.getMediaId() != null) {
            mediaClient.assignMediaToStory(story.getId(), List.of(request.getMediaId()));
        }

        UserProfileResponse user = profileClient.getUserById(userId);
        String mediaUrl = resolveMediaUrl(story);

        return storyMapper.toResponse(story, user, mediaUrl, 0L, false);
    }

    // ==================== XÓA STORY ====================
    @Transactional
    public void deleteStory(String userId, String storyId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new RuntimeException("Story not found"));

        if (!story.getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized to delete this story");
        }

        if (story.getMediaId() != null) {
            mediaClient.deleteByStoryId(storyId);
        }

        storyRepository.deleteById(storyId);
    }

    // ==================== FEED ====================
    public List<StoryResponse> getFeedStories(String userId) {
        // Lấy danh sách người mình đang follow
        List<String> followingIds = followClient.getFollowingIds(userId);
        if (followingIds.isEmpty()) return List.of();

        // Lấy stories của những người đó
        List<Story> stories = storyRepository.findFeedStories(followingIds, LocalDateTime.now());

        // Gom userId không trùng để batch fetch 1 lần
        List<String> userIds = new ArrayList<>();
        for (Story s : stories) {
            if (!userIds.contains(s.getUserId())) {
                userIds.add(s.getUserId());
            }
        }

        // Gọi profile-service
        List<UserProfileResponse> userList = profileClient.getUsersBatch(userIds);
        Map<String, UserProfileResponse> userMap = new HashMap<>();
        for (UserProfileResponse u : userList) {
            userMap.put(u.getUserId(), u);
        }

        // Build response cho từng story
        List<StoryResponse> result = new ArrayList<>();
        for (Story s : stories) {
            UserProfileResponse user = userMap.get(s.getUserId());
            String mediaUrl = resolveMediaUrl(s);
            long viewCount = storyViewRepository.countByStoryId(s.getId());
            boolean viewed = storyViewRepository.existsByStoryIdAndViewerId(s.getId(), userId);
            result.add(storyMapper.toResponse(s, user, mediaUrl, viewCount, viewed));
        }
        return result;
    }

    // ==================== STORY CỦA MÌNH ====================
    public List<StoryResponse> getMyStories(String userId) {
        List<Story> stories = storyRepository
                .findByUserIdAndArchivedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                        userId, LocalDateTime.now());

        UserProfileResponse user = profileClient.getUserById(userId);

        List<StoryResponse> result = new ArrayList<>();
        for (Story s : stories) {
            String mediaUrl = resolveMediaUrl(s);
            long viewCount = storyViewRepository.countByStoryId(s.getId());
            result.add(storyMapper.toResponse(s, user, mediaUrl, viewCount, true));
        }
        return result;
    }

    // ==================== KHO LƯU TRỮ ====================
    public List<StoryResponse> getArchive(String userId) {
        List<Story> stories = storyRepository
                .findByUserIdAndArchivedTrueOrderByCreatedAtDesc(userId);

        UserProfileResponse user = profileClient.getUserById(userId);

        List<StoryResponse> result = new ArrayList<>();
        for (Story s : stories) {
            String mediaUrl = resolveMediaUrl(s);
            long viewCount = storyViewRepository.countByStoryId(s.getId());
            result.add(storyMapper.toResponse(s, user, mediaUrl, viewCount, true));
        }
        return result;
    }

    // ==================== STORY CỦA USER KHÁC ====================
    public List<StoryResponse> getUserStories(String userId, String viewerId) {
        List<Story> stories = storyRepository
                .findByUserIdAndArchivedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                        userId, LocalDateTime.now());

        // Check follow
        boolean isFollowing = followClient.isFollowing(viewerId, userId);

        // Lọc những story viewer được phép xem
        List<Story> visibleStories = new ArrayList<>();
        for (Story s : stories) {
            if (canView(s.getScope(), viewerId, userId, isFollowing)) {
                visibleStories.add(s);
            }
        }

        UserProfileResponse user = profileClient.getUserById(userId);

        List<StoryResponse> result = new ArrayList<>();
        for (Story s : visibleStories) {
            String mediaUrl = resolveMediaUrl(s);
            long viewCount = storyViewRepository.countByStoryId(s.getId());
            boolean viewed = storyViewRepository.existsByStoryIdAndViewerId(s.getId(), viewerId);
            result.add(storyMapper.toResponse(s, user, mediaUrl, viewCount, viewed));
        }
        return result;
    }

    // ==================== ĐÁNH DẤU ĐÃ XEM ====================
    @Transactional
    public void markViewed(String storyId, String viewerId) {
        boolean alreadyViewed = storyViewRepository.existsByStoryIdAndViewerId(storyId, viewerId);
        if (!alreadyViewed) {
            StoryView view = StoryView.builder()
                    .id(UUID.randomUUID().toString())
                    .storyId(storyId)
                    .viewerId(viewerId)
                    .build();
            storyViewRepository.save(view);
        }
    }

    // ==================== XEM AI ĐÃ XEM ====================
    public List<StoryViewResponse> getViewers(String storyId, String requesterId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new RuntimeException("Story not found"));

        // Chỉ owner mới xem được danh sách
        if (!story.getUserId().equals(requesterId)) {
            throw new RuntimeException("Not authorized");
        }

        // Lấy danh sách bản ghi xem từ DB
        List<StoryView> views = storyViewRepository.findByStoryIdOrderByViewedAtDesc(storyId);

        // Gom viewerId để batch fetch thông tin user 1 lần
        List<String> viewerIds = new ArrayList<>();
        for (StoryView v : views) {
            viewerIds.add(v.getViewerId());
        }

        // Gọi profile-service, bỏ vào Map để tra nhanh
        List<UserProfileResponse> userList = profileClient.getUsersBatch(viewerIds);
        Map<String, UserProfileResponse> userMap = new HashMap<>();
        for (UserProfileResponse u : userList) {
            userMap.put(u.getUserId(), u);
        }

        // Build response
        List<StoryViewResponse> result = new ArrayList<>();
        for (StoryView v : views) {
            UserProfileResponse user = userMap.get(v.getViewerId());
            StoryViewResponse viewResponse = StoryViewResponse.builder()
                    .viewerId(v.getViewerId())
                    .username(user != null ? user.getUsername() : null)
                    .fullName(user != null ? user.getFullName() : null)
                    .avatarUrl(user != null ? user.getAvatarUrl() : null)
                    .viewedAt(v.getViewedAt())
                    .build();
            result.add(viewResponse);
        }
        return result;
    }

    // ==================== SCHEDULED: AUTO ARCHIVE ====================
    // Chạy mỗi 1 tiếng, chuyển stories hết hạn sang archive
    @Scheduled(fixedRate = 3_600_000)
    @Transactional
    public void archiveExpiredStories() {
        storyRepository.archiveExpiredStories(LocalDateTime.now());
    }

    // ==================== HELPER ====================

    // Lấy mediaUrl từ media-service nếu story có media
    private String resolveMediaUrl(Story story) {
        if (story.getMediaId() == null) return null;
        try {
            List<MediaResponse> medias = mediaClient.getByStoryId(story.getId());
            return medias.isEmpty() ? null : medias.get(0).getMediaUrl();
        } catch (Exception e) {
            return null;
        }
    }

    // Kiểm tra viewer có quyền xem story không dựa vào scope
    private boolean canView(String scope, String viewerId, String ownerId, boolean isFollowing) {
        // Owner luôn xem được story của mình
        if (ownerId.equals(viewerId)) return true;

        return switch (scope) {
            case "PUBLIC" -> true;           // ai cũng xem được
            case "FOLLOWERS" -> isFollowing; // chỉ người follow mới xem được
            case "ONLY_ME" -> false;         // chỉ mình tự xem
            default -> false;
        };
    }
}
