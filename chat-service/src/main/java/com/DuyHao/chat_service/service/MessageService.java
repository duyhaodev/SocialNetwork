package com.DuyHao.chat_service.service;

import com.DuyHao.chat_service.dto.RealtimeMessage;
import com.DuyHao.chat_service.dto.request.MessageRequest;
import com.DuyHao.chat_service.dto.response.MessageResponse;
import com.DuyHao.chat_service.dto.response.UserProfileResponse;
import com.DuyHao.chat_service.dto.response.StreakResponse;
import com.DuyHao.chat_service.entity.Conversation;
import com.DuyHao.chat_service.entity.Message;
import com.DuyHao.chat_service.repository.ConversationRepository;
import com.DuyHao.chat_service.repository.MessageRepository;
import com.DuyHao.chat_service.repository.httpClient.MediaClient;
import com.DuyHao.chat_service.repository.httpClient.ProfileClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MessageService {
    MessageRepository messageRepository;
    ConversationRepository conversationRepository;
    ProfileClient profileClient;
    MediaClient mediaClient;
    RedisPublisherService redisPublisherService;
    StreakService streakService;

    /**
     * Lấy messages có phân trang — trả về mới nhất trước (page 0 = tin mới nhất).
     * hasMore = true nếu còn trang tiếp theo (tin cũ hơn).
     */
    public record PagedMessagesResult(List<MessageResponse> messages, boolean hasMore) {}

    public PagedMessagesResult getMessagesPaged(String conversationId, int page, int size) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();

        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        boolean isParticipant = conv.getParticipants().stream()
                .anyMatch(p -> p.getUserId().equals(currentUserId));

        if (!isParticipant) {
            throw new RuntimeException("Access denied");
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messagePage = messageRepository.findAllByConversationIdOrderByCreatedAtDesc(conversationId, pageable);

        List<MessageResponse> responses = messagePage.getContent().stream()
                .map(msg -> toMessageResponse(msg, currentUserId))
                .collect(Collectors.toList());

        return new PagedMessagesResult(responses, messagePage.hasNext());
    }

    public MessageResponse create(MessageRequest request) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();

        Conversation conversation = conversationRepository.findById(request.getConversationId())
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        // Update conversation participants' unread status and last message
        String lastMessageContent = request.getContent();
        if ((lastMessageContent == null || lastMessageContent.isEmpty()) && request.getMedia() != null && !request.getMedia().isEmpty()) {
            String type = request.getMedia().get(0).getType();
            lastMessageContent = "image".equals(type) ? "[Hình ảnh]" : "[Video]";
        }

        conversation.setLastMessageContent(lastMessageContent);
        conversation.setLastMessageTimestamp(LocalDateTime.now());
        conversation.getParticipants().forEach(p -> {
            if (!p.getUserId().equals(currentUserId)) {
                p.setUnread(true);
            }
        });
        conversationRepository.save(conversation);

        // Save message
        Message message = Message.builder()
                .conversationId(request.getConversationId())
                .senderId(currentUserId)
                .content(request.getContent())
                .media(request.getMedia())
                .createdAt(LocalDateTime.now())
                .build();
        message = messageRepository.save(message);

        // Assign media to conversation in media-service
        if (request.getMedia() != null && !request.getMedia().isEmpty()) {
            try {
                List<String> mediaIds = request.getMedia().stream()
                        .map(m -> m.getId())
                        .filter(id -> id != null)
                        .collect(Collectors.toList());
                if (!mediaIds.isEmpty()) {
                    mediaClient.assignMediaToConversation(request.getConversationId(), mediaIds);
                }
            } catch (Exception e) {
                log.error("Failed to assign media to conversation: {}", e.getMessage());
            }
        }

        MessageResponse response = toMessageResponse(message, currentUserId);

        // Cập nhật streak nếu là chat DIRECT (group chat không tính streak)
        if ("DIRECT".equals(conversation.getType())) {
            try {
                streakService.onMessageSent(conversation.getId(), currentUserId);

                // Lấy streak mới nhất và đẩy realtime cho cả hai người biết
                StreakResponse streakResponse = streakService.getStreak(conversation.getId());
                RealtimeMessage streakMessage = RealtimeMessage.builder()
                        .toRoomId(conversation.getId())
                        .type("streak_updated")
                        .payload(streakResponse)
                        .build();
                redisPublisherService.publish(streakMessage);
            } catch (Exception e) {
                // Lỗi streak không được ảnh hưởng đến việc gửi tin nhắn
                log.error("[STREAK] Lỗi cập nhật streak cho conversation {}: {}", conversation.getId(), e.getMessage());
            }
        }

        // Push to room via Redis Pub/Sub
        RealtimeMessage rtMessage = RealtimeMessage.builder()
                .toRoomId(conversation.getId())
                .type("message") // Event name used in Socket.IO
                .payload(response)
                .build();

        redisPublisherService.publish(rtMessage);

        return response;
    }

    public MessageResponse revokeMessage(String messageId) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        // Check ownership
        if (!message.getSenderId().equals(currentUserId)) {
            throw new RuntimeException("Access denied: You can only revoke your own messages");
        }

        // Prevent revoking call logs
        if (message.getContent() != null && message.getContent().startsWith("📞 Cuộc gọi")) {
            throw new RuntimeException("Cannot revoke call log messages");
        }

        if (message.isRevoked()) {
            return toMessageResponse(message, currentUserId);
        }

        // Check 24-hour time limit
        LocalDateTime cutoff = message.getCreatedAt().plusHours(24);
        if (LocalDateTime.now().isAfter(cutoff)) {
            throw new RuntimeException("Cannot revoke message: 24-hour time limit exceeded");
        }

        // Update message
        message.setRevoked(true);
        message = messageRepository.save(message);

        // Update conversation last message if necessary
        Conversation conversation = conversationRepository.findById(message.getConversationId())
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        // Simplistic check: if this was the last message, update conversation display
        if (message.getContent() != null && message.getContent().equals(conversation.getLastMessageContent())) {
            conversation.setLastMessageContent("Tin nhắn đã bị thu hồi");
            conversationRepository.save(conversation);
        }

        MessageResponse response = toMessageResponse(message, currentUserId);

        // Push realtime event
        RealtimeMessage rtMessage = RealtimeMessage.builder()
                .toRoomId(message.getConversationId())
                .type("message_revoked")
                .payload(response)
                .build();
        redisPublisherService.publish(rtMessage);

        return response;
    }

    public MessageResponse editMessage(String messageId, String newContent) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        // Ownership check
        if (!message.getSenderId().equals(currentUserId)) {
            throw new RuntimeException("Access denied: You can only edit your own messages");
        }

        // Integrity checks
        if (message.isRevoked()) {
            throw new RuntimeException("Cannot edit a revoked message");
        }
        if (message.getContent() != null && message.getContent().startsWith("📞 Cuộc gọi")) {
            throw new RuntimeException("Cannot edit call log messages");
        }

        // "Most recent message" logic: Find the absolute latest message by this user in this conversation
        Message latestMsg = messageRepository.findFirstByConversationIdAndSenderIdOrderByCreatedAtDesc(
                        message.getConversationId(), currentUserId)
                .orElseThrow(() -> new RuntimeException("Latest message not found"));

        if (!latestMsg.getId().equals(messageId)) {
            throw new RuntimeException("Only the most recent message can be edited");
        }

        // Update message
        message.setContent(newContent);
        message.setEdited(true);
        message = messageRepository.save(message);

        // Update conversation display
        Conversation conversation = conversationRepository.findById(message.getConversationId())
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        // If it was the last message of the conversation, update sidebar preview
        if (message.getCreatedAt().equals(conversation.getLastMessageTimestamp()) ||
                message.getContent().equals(conversation.getLastMessageContent())) {
            conversation.setLastMessageContent(newContent);
            conversationRepository.save(conversation);
        }

        MessageResponse response = toMessageResponse(message, currentUserId);

        // Broadcast event
        RealtimeMessage rtMessage = RealtimeMessage.builder()
                .toRoomId(message.getConversationId())
                .type("message_edited")
                .payload(response)
                .build();
        redisPublisherService.publish(rtMessage);

        return response;
    }

    public MessageResponse reactToMessage(String messageId, String emoji) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        if (message.isRevoked()) {
            throw new RuntimeException("Cannot react to a revoked message");
        }
        if (message.getContent() != null && message.getContent().startsWith("📞 Cuộc gọi")) {
            throw new RuntimeException("Cannot react to call log messages");
        }

        java.util.Map<String, String> reactions = message.getReactions();
        if (reactions == null) {
            reactions = new java.util.HashMap<>();
        }

        // Toggle logic
        if (emoji.equals(reactions.get(currentUserId))) {
            reactions.remove(currentUserId);
        } else {
            reactions.put(currentUserId, emoji);
        }

        message.setReactions(reactions);
        message = messageRepository.save(message);

        MessageResponse response = toMessageResponse(message, currentUserId);

        // Broadcast event
        RealtimeMessage rtMessage = RealtimeMessage.builder()
                .toRoomId(message.getConversationId())
                .type("message_reaction_updated")
                .payload(response)
                .build();
        redisPublisherService.publish(rtMessage);

        return response;
    }

    private MessageResponse toMessageResponse(Message message, String currentUserId) {
        MessageResponse response = MessageResponse.builder()
                .id(message.getId())
                .conversationId(message.getConversationId())
                .content(message.getContent())
                .media(message.getMedia())
                .createdAt(message.getCreatedAt())
                .isMe(message.getSenderId().equals(currentUserId))
                .isRevoked(message.isRevoked())
                .isEdited(message.isEdited())
                .reactions(message.getReactions())
                .type(message.getType())
                .build();

        try {
            // Bỏ qua fetch profile cho system message
            if (!"SYSTEM".equals(message.getSenderId())) {
                UserProfileResponse profile = profileClient.getProfile(message.getSenderId());
                if (profile != null) {
                    response.setSender(MessageResponse.SenderInfo.builder()
                            .id(profile.getUserId())
                            .fullName(profile.getFullName())
                            .avatarUrl(profile.getAvatarUrl())
                            .build());
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch sender profile: {}", e.getMessage());
        }

        return response;
    }
}
