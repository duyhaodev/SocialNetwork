package com.DuyHao.chat_service.service;

import com.DuyHao.chat_service.dto.request.ConversationRequest;
import com.DuyHao.chat_service.dto.response.ConversationResponse;
import com.DuyHao.chat_service.dto.response.UserProfileResponse;
import com.DuyHao.chat_service.entity.Conversation;
import com.DuyHao.chat_service.repository.ConversationRepository;
import com.DuyHao.chat_service.repository.httpClient.ProfileClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ConversationService {
    ConversationRepository conversationRepository;
    ProfileClient profileClient;
    StringRedisTemplate redisTemplate;

    private static final String ONLINE_USERS_KEY = "user:online:set";

    public ConversationResponse create(ConversationRequest request) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();

        // Target user ID
        String targetUserId = request.getParticipantIds().getFirst();

        // 1-1 participants hash
        List<String> ids = Arrays.asList(currentUserId, targetUserId);
        Collections.sort(ids);
        String hash = String.join("_", ids);

        Optional<Conversation> existingConv = conversationRepository.findByParticipantsHash(hash);
        if (existingConv.isPresent()) {
            Conversation conv = existingConv.get();
            boolean unread = conv.getParticipants().stream()
                    .filter(p -> p.getUserId().equals(currentUserId))
                    .findFirst()
                    .map(Conversation.Participant::isUnread)
                    .orElse(false);
            return toConversationResponse(conv, currentUserId, unread);
        }

        // New conversation
        Conversation.Participant p1 = Conversation.Participant.builder()
                .userId(currentUserId)
                .unread(false)
                .isAdmin(true)
                .build();

        Conversation.Participant p2 = Conversation.Participant.builder()
                .userId(targetUserId)
                .unread(false)
                .isAdmin(false)
                .build();

        Conversation conversation = Conversation.builder()
                .type("DIRECT")
                .participantsHash(hash)
                .participants(List.of(p1, p2))
                .createdAt(LocalDateTime.now())
                .build();

        conversation = conversationRepository.save(conversation);

        return toConversationResponse(conversation, currentUserId, false);
    }

    public ConversationResponse createGroup(ConversationRequest request) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();

        List<Conversation.Participant> participants = new ArrayList<>();
        // Add creator as Admin
        participants.add(Conversation.Participant.builder()
                .userId(currentUserId)
                .unread(false)
                .isAdmin(true)
                .build());

        // Add others
        if (request.getParticipantIds() != null) {
            request.getParticipantIds().stream()
                    .filter(id -> !id.equals(currentUserId))
                    .forEach(id -> participants.add(Conversation.Participant.builder()
                            .userId(id)
                            .unread(false)
                            .isAdmin(false)
                            .build()));
        }

        Conversation conversation = Conversation.builder()
                .type("GROUP")
                .name(request.getName())
                .avatarUrl(request.getAvatarUrl())
                .createdBy(currentUserId)
                .participants(participants)
                .createdAt(LocalDateTime.now())
                .build();

        conversation = conversationRepository.save(conversation);

        return toConversationResponse(conversation, currentUserId, false);
    }

    public List<ConversationResponse> myConversations() {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Debug - currentUserId: {}", currentUserId);

        List<Conversation> conversations = conversationRepository.findAllByParticipantUserId(currentUserId);
        log.info("Debug - conversations for {}: {}", currentUserId, conversations);

        return conversations.stream()
                .map(conv -> {
                    boolean unread = conv.getParticipants().stream()
                            .filter(p -> p.getUserId().equals(currentUserId))
                            .findFirst()
                            .map(Conversation.Participant::isUnread)
                            .orElse(false);
                    return toConversationResponse(conv, currentUserId, unread);
                })
                .sorted((c1, c2) -> {
                    LocalDateTime t1 = c1.getLastMessageTimestamp() != null ? c1.getLastMessageTimestamp() : c1.getCreatedAt();
                    LocalDateTime t2 = c2.getLastMessageTimestamp() != null ? c2.getLastMessageTimestamp() : c2.getCreatedAt();
                    return t2.compareTo(t1);
                })
                .collect(Collectors.toList());
    }

    public boolean markAsRead(String conversationId) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Conversation> convOpt = conversationRepository.findById(conversationId);
        if (convOpt.isPresent()) {
            Conversation conv = convOpt.get();
            conv.getParticipants().stream()
                    .filter(p -> p.getUserId().equals(currentUserId))
                    .findFirst()
                    .ifPresent(p -> p.setUnread(false));
            conversationRepository.save(conv);
            return true;
        }
        return false;
    }

    public ConversationResponse addParticipants(String conversationId, List<String> userIds) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        if (!"GROUP".equals(conversation.getType())) {
            throw new RuntimeException("Cannot add participants to a DIRECT conversation");
        }

        // Only participants can add others
        boolean isParticipant = conversation.getParticipants().stream()
                .anyMatch(p -> p.getUserId().equals(currentUserId));
        if (!isParticipant) {
            throw new RuntimeException("Access denied");
        }

        Set<String> existingUserIds = conversation.getParticipants().stream()
                .map(Conversation.Participant::getUserId)
                .collect(Collectors.toSet());

        userIds.stream()
                .filter(id -> !existingUserIds.contains(id))
                .forEach(id -> conversation.getParticipants().add(Conversation.Participant.builder()
                        .userId(id)
                        .unread(true)
                        .isAdmin(false)
                        .build()));

        conversationRepository.save(conversation);
        return toConversationResponse(conversation, currentUserId, false);
    }

    public ConversationResponse removeParticipant(String conversationId, String userId) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        if (!"GROUP".equals(conversation.getType())) {
            throw new RuntimeException("Cannot remove participants from a DIRECT conversation");
        }

        // Check if current user is admin OR if the user is removing themselves
        boolean isAdmin = conversation.getParticipants().stream()
                .anyMatch(p -> p.getUserId().equals(currentUserId) && p.isAdmin());
        
        if (!isAdmin && !currentUserId.equals(userId)) {
            throw new RuntimeException("No permission to remove this participant");
        }

        conversation.getParticipants().removeIf(p -> p.getUserId().equals(userId));

        // If no participants left, maybe delete the conversation? For now just save.
        conversationRepository.save(conversation);
        
        return toConversationResponse(conversation, currentUserId, false);
    }

    private ConversationResponse toConversationResponse(Conversation conversation, String currentUserId, boolean unread) {
        ConversationResponse response = ConversationResponse.builder()
                .id(conversation.getId())
                .type(conversation.getType())
                .lastMessageContent(conversation.getLastMessageContent())
                .lastMessageTimestamp(conversation.getLastMessageTimestamp())
                .createdAt(conversation.getCreatedAt())
                .unread(unread)
                .build();

        if ("GROUP".equals(conversation.getType())) {
            response.setConversationName(conversation.getName());
            response.setConversationAvatar(conversation.getAvatarUrl());
        } else {
            // Get partner info from profile-service
            conversation.getParticipants().stream()
                    .filter(p -> !p.getUserId().equals(currentUserId))
                    .findFirst()
                    .ifPresent(partner -> {
                        try {
                            UserProfileResponse profile = profileClient.getProfile(partner.getUserId());
                            if (profile != null) {
                                response.setConversationName(profile.getFullName());
                                // response.setConversationAvatar(profile.getAvatarUrl()); // Avatar missing in profile-service currently
                                response.setPartnerId(profile.getUserId());

                                // Check online status from Redis
                                Boolean isOnline = redisTemplate.opsForSet().isMember(ONLINE_USERS_KEY, partner.getUserId());
                                response.setOnline(Boolean.TRUE.equals(isOnline));
                            }
                        } catch (Exception e) {
                            log.error("Failed to fetch profile for user {}: {}", partner.getUserId(), e.getMessage());
                            response.setConversationName("Unknown User");
                        }
                    });
        }

        return response;
    }
}
