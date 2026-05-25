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
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
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
        
        // Busy Check: Caller
        if (!callRepository.findActiveSessionsByUserId(currentUserId).isEmpty()) {
            throw new RuntimeException("You are already in another call session");
        }

        // Busy Check: Callee
        if (!callRepository.findActiveSessionsByUserId(request.getCalleeId()).isEmpty()) {
            throw new RuntimeException("User is busy in another call");
        }

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
        
        if ("IN_PROGRESS".equals(session.getStatus()) || "COMPLETED".equals(session.getStatus()) || 
            "REJECTED".equals(session.getStatus()) || "MISSED".equals(session.getStatus())) {
            return toCallResponse(session);
        }

        // Busy Check before starting
        boolean isCallerBusy = callRepository.findActiveSessionsByUserId(session.getCallerId()).stream()
                .anyMatch(s -> !s.getId().equals(callId));
        boolean isCalleeBusy = callRepository.findActiveSessionsByUserId(session.getCalleeId()).stream()
                .anyMatch(s -> !s.getId().equals(callId));

        if (isCallerBusy || isCalleeBusy) {
            session.setStatus("REJECTED");
            session.setEndTime(LocalDateTime.now());
            callRepository.save(session);
            throw new RuntimeException("One of the parties is now busy in another call");
        }

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
        
        if ("COMPLETED".equals(session.getStatus()) || "REJECTED".equals(session.getStatus()) || "MISSED".equals(session.getStatus())) {
            return toCallResponse(session);
        }

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
        
        if ("COMPLETED".equals(session.getStatus()) || "REJECTED".equals(session.getStatus()) || "MISSED".equals(session.getStatus())) {
            return toCallResponse(session);
        }

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
        
        if ("COMPLETED".equals(session.getStatus()) || "REJECTED".equals(session.getStatus()) || "MISSED".equals(session.getStatus())) {
            return toCallResponse(session);
        }

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

    @Scheduled(fixedRate = 60000) // Run every minute
    public void cleanupZombieSessions() {
        log.info("Starting cleanup of zombie call sessions...");
        List<CallSession> activeSessions = callRepository.findAllByStatusIn(List.of("RINGING", "IN_PROGRESS"));
        
        LocalDateTime now = LocalDateTime.now();
        
        for (CallSession session : activeSessions) {
            try {
                // 1. RINGING Timeout (2 minutes)
                if ("RINGING".equals(session.getStatus()) && session.getCreatedAt().plusMinutes(2).isBefore(now)) {
                    log.info("Cleaning up RINGING session {} due to timeout", session.getId());
                    cancelCall(session.getId());
                    continue;
                }

                // 2. IN_PROGRESS but both users offline
                if ("IN_PROGRESS".equals(session.getStatus())) {
                    Boolean isCallerOnline = redisTemplate.opsForSet().isMember(ONLINE_USERS_KEY, session.getCallerId());
                    Boolean isCalleeOnline = redisTemplate.opsForSet().isMember(ONLINE_USERS_KEY, session.getCalleeId());
                    
                    if (Boolean.FALSE.equals(isCallerOnline) && Boolean.FALSE.equals(isCalleeOnline)) {
                        log.info("Cleaning up IN_PROGRESS session {} because both users are offline", session.getId());
                        endCall(session.getId());
                    }
                }
            } catch (Exception e) {
                log.error("Error cleaning up session {}: {}", session.getId(), e.getMessage());
            }
        }
    }

    private void saveCallLogMessage(CallSession session) {
        String content = String.format("📞 Cuộc gọi %s", "VIDEO".equals(session.getType()) ? "Video" : "Thoại");
        
        if ("COMPLETED".equals(session.getStatus()) && session.getStartTime() != null && session.getEndTime() != null) {
            long durationInSeconds = java.time.Duration.between(session.getStartTime(), session.getEndTime()).getSeconds();
            long minutes = durationInSeconds / 60;
            long seconds = durationInSeconds % 60;
            
            String durationStr = (minutes > 0 ? minutes + " phút " : "") + seconds + " giây";
            content += " - " + durationStr;
        } else if ("MISSED".equals(session.getStatus())) {
            content += " bị nhỡ";
        } else if ("REJECTED".equals(session.getStatus())) {
            content += " bị từ chối";
        }

        MessageRequest request = MessageRequest.builder()
                .conversationId(session.getConversationId())
                .content(content)
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
