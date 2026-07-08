package com.DuyHao.identify_service.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RealtimeEventPublisher {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${realtime.redis.channel}")
    private String channel;

    /**
     * Gửi event force_logout đến một user cụ thể thông qua realtime-service.
     * realtime-service lắng nghe Redis channel và forward event qua Socket.IO.
     */
    public void publishForceLogout(String userId) {
        try {
            Map<String, Object> message = Map.of(
                    "toUserId", userId,
                    "type", "force_logout",
                    "payload", Map.of("reason", "BANNED")
            );
            String json = objectMapper.writeValueAsString(message);
            redisTemplate.convertAndSend(channel, json);
            log.info("Published force_logout event for userId={}", userId);
        } catch (Exception e) {
            log.error("Failed to publish force_logout for userId={}: {}", userId, e.getMessage());
        }
    }
}
