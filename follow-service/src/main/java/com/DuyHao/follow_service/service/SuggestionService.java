package com.DuyHao.follow_service.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.DuyHao.follow_service.client.UserClient;
import com.DuyHao.follow_service.dto.SuggestionResponse;
import com.DuyHao.follow_service.dto.UserProfileResponse;
import com.DuyHao.follow_service.repository.FollowRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class SuggestionService {

    private final FollowRepository followRepo;
    private final UserClient userClient;

    public List<SuggestionResponse> getSuggestions(String currentUserId, int page, int size) {

        // Lấy danh sách người A đang follow
        Set<String> myFollowings = followRepo.findByFollowerId(currentUserId).stream()
                .map(f -> f.getFollowingId())
                .collect(Collectors.toSet());

        // Lấy danh sách người đang follow lại A
        Set<String> myFollowers = followRepo.findByFollowingId(currentUserId).stream()
                .map(f -> f.getFollowerId())
                .collect(Collectors.toSet());

        // Lấy danh sách bạn bè
        Set<String> myFriends = new HashSet<>(myFollowings);
        myFriends.retainAll(myFollowers);

        // Lấy dánh sách friends của bạn bè
        Set<String> candidates = new HashSet<>();
        for (String friendId : myFriends) {
            // Lấy những người friend đang follow
            Set<String> friendFollowings = followRepo.findByFollowerId(friendId).stream()
                    .map(f -> f.getFollowingId())
                    .collect(Collectors.toSet());

            // Lấy những người đang follow lại friend
            Set<String> friendFollowers = followRepo.findByFollowingId(friendId).stream()
                    .map(f -> f.getFollowerId())
                    .collect(Collectors.toSet());

            // Bạn bè của friend = follow 2 chiều với friend
            Set<String> friendsOfFriend = new HashSet<>(friendFollowings);
            friendsOfFriend.retainAll(friendFollowers);

            // Chỉ lấy người A chưa follow và không phải chính A
            friendsOfFriend.stream()
                    .filter(id -> !id.equals(currentUserId))
                    .filter(id -> !myFollowings.contains(id))
                    .forEach(candidates::add);
        }

        // Lấy thông tin profile của currentUser để biết city
        UserProfileResponse myProfile = userClient.getUserById(currentUserId);
        String myCity = null;
        if (myProfile != null) {
            myCity = myProfile.getCity();
        }

        // Lấy thông tin profile của tất cả candidates
        List<String> candidateIds = candidates.stream().toList();
        if (candidateIds.isEmpty()) {
            return userClient.getTopFollowers(page * size + size).stream()
                    .filter(p -> !p.getUserId().equals(currentUserId))
                    .filter(p -> !myFollowings.contains(p.getUserId()))
                    .skip((long) page * size)
                    .limit(size)
                    .map(p -> SuggestionResponse.builder()
                            .userId(p.getUserId())
                            .username(p.getUsername())
                            .fullName(p.getFullName())
                            .avatarUrl(p.getAvatarUrl())
                            .city(p.getCity())
                            .followerCount(p.getFollowerCount())
                            .mutualCount(0)
                            .build())
                    .collect(Collectors.toList());
        }
        List<UserProfileResponse> profiles = userClient.getUsersBatch(candidateIds);

        // Chuyển List<UserProfileResponse> thành Map<userId, profile> để tra nhanh
        Map<String, UserProfileResponse> profileMap =
                profiles.stream().collect(Collectors.toMap(UserProfileResponse::getUserId, p -> p));

        // Tính bạn chung
        // Map<candidateId, Set<mutualFriendId>>
        Map<String, Set<String>> mutualFriendsMap = new HashMap<>();
        for (String candidateId : candidates) {
            Set<String> candidateFollowings = followRepo.findByFollowerId(candidateId).stream()
                    .map(f -> f.getFollowingId())
                    .collect(Collectors.toSet());

            Set<String> candidateFollowers = followRepo.findByFollowingId(candidateId).stream()
                    .map(f -> f.getFollowerId())
                    .collect(Collectors.toSet());

            // Friends của candidate
            Set<String> candidateFriends = new HashSet<>(candidateFollowings);
            candidateFriends.retainAll(candidateFollowers);

            // Bạn chung
            candidateFriends.retainAll(myFriends);
            mutualFriendsMap.put(candidateId, candidateFriends);
        }

        // Lấy profile của tất cả bạn chung để có avatar
        // Gom tất cả mutualFriendId từ mọi candidate, batch 1 lần
        Set<String> allMutualIds =
                mutualFriendsMap.values().stream().flatMap(Set::stream).collect(Collectors.toSet());

        Map<String, UserProfileResponse> mutualProfileMap = new HashMap<>();
        if (!allMutualIds.isEmpty()) {
            userClient
                    .getUsersBatch(allMutualIds.stream().toList())
                    .forEach(p -> mutualProfileMap.put(p.getUserId(), p));
        }

        // Tính score và sort giảm dần, lấy top limit
        // score = (mutualCount * 3) + (sameCity ? 2 : 0) + (followerCount / 1000.0)
        final String finalMyCity = myCity;
        return candidates.stream()
                .filter(profileMap::containsKey)
                .map(candidateId -> {
                    // Lấy profile của candidate
                    UserProfileResponse profile = profileMap.get(candidateId);
                    Set<String> mutualIds = mutualFriendsMap.getOrDefault(candidateId, Set.of());
                    int mutual = mutualIds.size();
                    // Kiểm tra có cùng thành phố
                    boolean sameCity = finalMyCity != null && finalMyCity.equalsIgnoreCase(profile.getCity());

                    double score = (mutual * 3.0) + (sameCity ? 2.0 : 0.0) + (profile.getFollowerCount() / 1000.0);

                    // Lấy tối đa 2 avatar của bạn chung để hiển thị
                    List<String> mutualAvatars = new ArrayList<>();
                    for (String id : mutualIds) {
                        if (mutualAvatars.size() >= 2) break;
                        if (mutualProfileMap.containsKey(id)) {
                            String avatarUrl = mutualProfileMap.get(id).getAvatarUrl();
                            if (avatarUrl != null && !avatarUrl.isBlank()) {
                                mutualAvatars.add(avatarUrl);
                            }
                        }
                    }
                    // SuggestionResponse trả về Fe
                    SuggestionResponse suggestion = SuggestionResponse.builder()
                            .userId(profile.getUserId())
                            .username(profile.getUsername())
                            .fullName(profile.getFullName())
                            .avatarUrl(profile.getAvatarUrl())
                            .city(profile.getCity())
                            .followerCount(profile.getFollowerCount())
                            .mutualCount(mutual)
                            .mutualFriendAvatars(mutualAvatars)
                            .build();

                    return new Object[] {suggestion, score};
                })
                // Sort theo score giảm dần
                .sorted(Comparator.comparingDouble(arr -> -(double) ((Object[]) arr)[1]))
                .skip((long) page * size)
                .limit(size)
                .map(arr -> (SuggestionResponse) ((Object[]) arr)[0])
                .collect(Collectors.toList());
    } //
}
