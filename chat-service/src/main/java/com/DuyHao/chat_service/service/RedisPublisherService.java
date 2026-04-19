package com.DuyHao.chat_service.service;

import com.DuyHao.chat_service.dto.RealtimeMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RedisPublisherService {
    final StringRedisTemplate redisTemplate;
    final ObjectMapper objectMapper;

    @Value("${rt-service.redis.channel:realtime-topic}")
    String channel;

    public void publish(RealtimeMessage message) {
        try {
            String jsonMessage = objectMapper.writeValueAsString(message);
            redisTemplate.convertAndSend(channel, jsonMessage);
            log.info("Published message to Redis channel {}: {}", channel, jsonMessage);
        } catch (Exception e) {
            log.error("Failed to publish message to Redis", e);
        }
    }
}
