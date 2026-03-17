package com.DuyHao.chat_service.service;

import com.DuyHao.chat_service.dto.request.MessageRequest;
import com.DuyHao.chat_service.dto.response.MessageResponse;
import com.DuyHao.chat_service.dto.response.UserProfileResponse;
import com.DuyHao.chat_service.entity.Conversation;
import com.DuyHao.chat_service.entity.Message;
import com.DuyHao.chat_service.entity.WebSocketSession;
import com.DuyHao.chat_service.repository.ConversationRepository;
import com.DuyHao.chat_service.repository.MessageRepository;
import com.DuyHao.chat_service.repository.WebSocketSessionRepository;
import com.DuyHao.chat_service.repository.httpClient.ProfileClient;
import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MessageService {
    MessageRepository messageRepository;
    ConversationRepository conversationRepository;
    WebSocketSessionRepository webSocketSessionRepository;
    ProfileClient profileClient;
    SocketIOServer socketIOServer;
    ObjectMapper objectMapper;

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
        // Note: For large history, this should be optimized with caching
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

        // Push to online participants
        List<String> participantIds = conversation.getParticipants().stream()
                .map(Conversation.Participant::getUserId)
                .toList();

        List<WebSocketSession> sessions = webSocketSessionRepository.findAllByUserIdIn(participantIds);

        sessions.forEach(session -> {
            try {
                SocketIOClient client = socketIOServer.getClient(UUID.fromString(session.getSocketSessionId()));
                if (client != null) {
                    // Adjust isMe for the receiver
                    response.setMe(session.getUserId().equals(currentUserId));
                    client.sendEvent("message", objectMapper.writeValueAsString(response));
                }
            } catch (Exception e) {
                log.error("Error pushing message to socket {}: {}", session.getSocketSessionId(), e.getMessage());
            }
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
                        .id(profile.getId())
                        .fullName(profile.getFullName())
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to fetch sender profile: {}", e.getMessage());
        }

        return response;
    }
}
