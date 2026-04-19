package com.DuyHao.realtime_service.service;

import com.DuyHao.realtime_service.dto.RealtimeMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RedisMessageListener {
    SocketService socketService;
    ObjectMapper objectMapper;

    /**
     * Tên phương thức này phải khớp với tham số trong MessageListenerAdapter ở RedisConfig
     */
    public void onMessageReceived(String message) {
        try {
            log.info("Received message from Redis: {}", message);
            RealtimeMessage realtimeMessage = objectMapper.readValue(message, RealtimeMessage.class);
            
            // Push message tới user thông qua Socket.IO
            socketService.sendMessage(
                realtimeMessage.getToUserId(), 
                realtimeMessage.getType(), 
                realtimeMessage.getPayload()
            );
            
        } catch (Exception e) {
            log.error("Error parsing Redis message: {}", message, e);
        }
    }
}
