package com.DuyHao.chat_service.service;

import com.DuyHao.chat_service.dto.RealtimeMessage;
import com.DuyHao.chat_service.dto.request.CallRequest;
import com.DuyHao.chat_service.dto.request.MessageRequest;
import com.DuyHao.chat_service.dto.response.CallResponse;
import com.DuyHao.chat_service.entity.CallSession;
import com.DuyHao.chat_service.repository.CallRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CallService {
    CallRepository callRepository;
    RedisPublisherService redisPublisherService;
    MessageService messageService;
    StringRedisTemplate redisTemplate;

    private static final String ONLINE_USERS_KEY = "user:online:set";

    public CallResponse initiateCall(CallRequest request) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
        
        // 1. Check online status
        Boolean isOnline = redisTemplate.opsForSet().isMember(ONLINE_USERS_KEY, request.getCalleeId());
        
        CallSession session = CallSession.builder()
                .callerId(currentUserId)
                .calleeId(request.getCalleeId())
                .conversationId(request.getConversationId())
                .type(request.getType())
                .createdAt(LocalDateTime.now())
                .build();

        if (Boolean.FALSE.equals(isOnline)) {
            // 2. Handle Offline (Missed Call)
            session.setStatus("MISSED");
            session.setEndTime(LocalDateTime.now());
            session = callRepository.save(session);
            
            saveCallLogMessage(session);
            return toCallResponse(session);
        }

        // 3. Handle Online (Ringing)
        session.setStatus("RINGING");
        session = callRepository.save(session);

        // Notify callee via Redis Pub/Sub -> Realtime Service -> Socket.IO
        RealtimeMessage rtMessage = RealtimeMessage.builder()
                .toUserId(request.getCalleeId())
                .type("incoming_call")
                .payload(toCallResponse(session))
                .build();
        redisPublisherService.publish(rtMessage);

        return toCallResponse(session);
    }

    public CallResponse acceptCall(String callId) {
        CallSession session = callRepository.findById(callId)
                .orElseThrow(() -> new RuntimeException("Call not found"));
        
        session.setStatus("IN_PROGRESS");
        session.setStartTime(LocalDateTime.now());
        session = callRepository.save(session);

        // Notify caller
        RealtimeMessage rtMessage = RealtimeMessage.builder()
                .toUserId(session.getCallerId())
                .type("call_accepted")
                .payload(toCallResponse(session))
                .build();
        redisPublisherService.publish(rtMessage);

        return toCallResponse(session);
    }

    public CallResponse rejectCall(String callId) {
        CallSession session = callRepository.findById(callId)
                .orElseThrow(() -> new RuntimeException("Call not found"));
        
        session.setStatus("REJECTED");
        session.setEndTime(LocalDateTime.now());
        session = callRepository.save(session);

        saveCallLogMessage(session);

        // Notify caller
        RealtimeMessage rtMessage = RealtimeMessage.builder()
                .toUserId(session.getCallerId())
                .type("call_rejected")
                .payload(toCallResponse(session))
                .build();
        redisPublisherService.publish(rtMessage);

        return toCallResponse(session);
    }

    public CallResponse cancelCall(String callId) {
        CallSession session = callRepository.findById(callId)
                .orElseThrow(() -> new RuntimeException("Call not found"));
        
        session.setStatus("MISSED");
        session.setEndTime(LocalDateTime.now());
        session = callRepository.save(session);

        saveCallLogMessage(session);

        // Notify callee to stop ringing
        RealtimeMessage rtMessage = RealtimeMessage.builder()
                .toUserId(session.getCalleeId())
                .type("call_cancelled")
                .payload(toCallResponse(session))
                .build();
        redisPublisherService.publish(rtMessage);

        return toCallResponse(session);
    }

    public CallResponse endCall(String callId) {
        CallSession session = callRepository.findById(callId)
                .orElseThrow(() -> new RuntimeException("Call not found"));
        
        session.setStatus("COMPLETED");
        session.setEndTime(LocalDateTime.now());
        session = callRepository.save(session);

        saveCallLogMessage(session);

        // Notify both parties
        RealtimeMessage rtToCallee = RealtimeMessage.builder()
                .toUserId(session.getCalleeId())
                .type("call_ended")
                .payload(toCallResponse(session))
                .build();
        redisPublisherService.publish(rtToCallee);

        RealtimeMessage rtToCaller = RealtimeMessage.builder()
                .toUserId(session.getCallerId())
                .type("call_ended")
                .payload(toCallResponse(session))
                .build();
        redisPublisherService.publish(rtToCaller);

        return toCallResponse(session);
    }

    private void saveCallLogMessage(CallSession session) {
        // Here we can call messageService.create with a special type or content
        // For now, let's just create a text message describing the call
        String content = String.format("Call %s - %s", session.getType(), session.getStatus());
        if ("COMPLETED".equals(session.getStatus()) && session.getStartTime() != null) {
            // Calculate duration...
        }

        MessageRequest request = MessageRequest.builder()
                .conversationId(session.getConversationId())
                .content(content) // In a real app, this would be a structured message
                .build();
        
        try {
            messageService.create(request);
        } catch (Exception e) {
            log.error("Failed to save call log message: {}", e.getMessage());
        }
    }

    private CallResponse toCallResponse(CallSession session) {
        return CallResponse.builder()
                .id(session.getId())
                .callerId(session.getCallerId())
                .calleeId(session.getCalleeId())
                .conversationId(session.getConversationId())
                .type(session.getType())
                .status(session.getStatus())
                .startTime(session.getStartTime())
                .endTime(session.getEndTime())
                .createdAt(session.getCreatedAt())
                .build();
    }
}
