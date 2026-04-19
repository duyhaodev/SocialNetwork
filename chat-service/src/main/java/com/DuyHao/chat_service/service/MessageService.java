package com.DuyHao.chat_service.service;

import com.DuyHao.chat_service.dto.RealtimeMessage;
import com.DuyHao.chat_service.dto.request.MessageRequest;
import com.DuyHao.chat_service.dto.response.MessageResponse;
import com.DuyHao.chat_service.dto.response.UserProfileResponse;
import com.DuyHao.chat_service.entity.Conversation;
import com.DuyHao.chat_service.entity.Message;
import com.DuyHao.chat_service.repository.ConversationRepository;
import com.DuyHao.chat_service.repository.MessageRepository;
import com.DuyHao.chat_service.repository.httpClient.ProfileClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
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
    RedisPublisherService redisPublisherService;

    public List<MessageResponse> getMessages(String conversationId) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();

        // Check if participant
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        
        boolean isParticipant = conv.getParticipants().stream()
                .anyMatch(p -> p.getUserId().equals(currentUserId));
        
        if (!isParticipant) {
            throw new RuntimeException("Access denied");
        }

        List<Message> messages = messageRepository.findAllByConversationIdOrderByCreatedAtDesc(conversationId);

        // Fetch sender profiles for better display
        return messages.stream()
                .map(msg -> toMessageResponse(msg, currentUserId))
                .collect(Collectors.toList());
    }

    public MessageResponse create(MessageRequest request) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();

        Conversation conversation = conversationRepository.findById(request.getConversationId())
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        // Update conversation participants' unread status and last message
        conversation.setLastMessageContent(request.getContent());
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
                .createdAt(LocalDateTime.now())
                .build();
        message = messageRepository.save(message);

        MessageResponse response = toMessageResponse(message, currentUserId);

        // Push to all participants via Redis Pub/Sub
        conversation.getParticipants().forEach(participant -> {
            // Adjust isMe for the receiver
            response.setMe(participant.getUserId().equals(currentUserId));
            
            RealtimeMessage rtMessage = RealtimeMessage.builder()
                    .toUserId(participant.getUserId())
                    .type("message") // Event name used in Socket.IO
                    .payload(response)
                    .build();
            
            redisPublisherService.publish(rtMessage);
        });

        // Restore isMe for sender's response
        response.setMe(true);
        return response;
    }

    private MessageResponse toMessageResponse(Message message, String currentUserId) {
        MessageResponse response = MessageResponse.builder()
                .id(message.getId())
                .conversationId(message.getConversationId())
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .isMe(message.getSenderId().equals(currentUserId))
                .build();

        try {
            UserProfileResponse profile = profileClient.getProfile(message.getSenderId());
            if (profile != null) {
                response.setSender(MessageResponse.SenderInfo.builder()
                        .id(profile.getUserId())
                        .fullName(profile.getFullName())
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to fetch sender profile: {}", e.getMessage());
        }

        return response;
    }
}
