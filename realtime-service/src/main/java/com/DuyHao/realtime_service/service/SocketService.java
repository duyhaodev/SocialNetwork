package com.DuyHao.realtime_service.service;

import com.DuyHao.realtime_service.config.CustomJwtDecoder;
import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SocketService {
    SocketIOServer server;
    StringRedisTemplate redisTemplate;
    CustomJwtDecoder customJwtDecoder;

    // Mapping: UserId -> Set of SocketIOClient IDs
    Map<String, Set<UUID>> userSessions = new ConcurrentHashMap<>();
    
    // Mapping: SessionId -> UserId (giúp cleanup nhanh khi disconnect)
    Map<UUID, String> sessionUserMap = new ConcurrentHashMap<>();

    @PostConstruct
    public void start() {
        server.addConnectListener(this::onConnect);
        server.addDisconnectListener(this::onDisconnect);
        server.start();
        log.info("Socket.IO server started at {}:{}", server.getConfiguration().getHostname(), server.getConfiguration().getPort());
    }

    @PreDestroy
    public void stop() {
        server.stop();
        log.info("Socket.IO server stopped.");
    }

    private void onConnect(SocketIOClient client) {
        String token = getTokenFromClient(client);

        if (token != null) {
            try {
                Jwt jwt = customJwtDecoder.decode(token);
                String userId = jwt.getSubject();

                if (userId != null) {
                    userSessions.computeIfAbsent(userId, k -> new CopyOnWriteArraySet<>()).add(client.getSessionId());
                    sessionUserMap.put(client.getSessionId(), userId);
                    
                    // Cập nhật trạng thái Online lên Redis
                    redisTemplate.opsForValue().set("user:online:" + userId, "true");
                    
                    log.info("Client connected: userId={}, sessionId={}", userId, client.getSessionId());
                }
            } catch (Exception e) {
                log.error("Error during connection for session {}: {}", client.getSessionId(), e.getMessage());
                client.disconnect();
            }
        } else {
            log.warn("Connection attempt without token, session={}", client.getSessionId());
            client.disconnect();
        }
    }

    private void onDisconnect(SocketIOClient client) {
        UUID sessionId = client.getSessionId();
        String userId = sessionUserMap.remove(sessionId);
        
        if (userId != null) {
            Set<UUID> sessions = userSessions.get(userId);
            if (sessions != null) {
                sessions.remove(sessionId);
                if (sessions.isEmpty()) {
                    userSessions.remove(userId);
                    // Xóa trạng thái Online khỏi Redis khi không còn session nào
                    redisTemplate.delete("user:online:" + userId);
                }
            }
            log.info("Client disconnected: userId={}, sessionId={}", userId, sessionId);
        }
    }

    private String getTokenFromClient(SocketIOClient client) {
        // Thử lấy từ Header
        String authHeader = client.getHandshakeData().getHttpHeaders().get("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        // Thử lấy từ Query Parameter
        return client.getHandshakeData().getSingleUrlParam("token");
    }

    public void sendMessage(String toUserId, String event, Object data) {
        Set<UUID> sessions = userSessions.get(toUserId);
        if (sessions != null) {
            for (UUID sessionId : sessions) {
                SocketIOClient client = server.getClient(sessionId);
                if (client != null) {
                    client.sendEvent(event, data);
                    log.info("Sent event '{}' to userId={}, session={}", event, toUserId, sessionId);
                }
            }
        } else {
            log.debug("User {} is offline, message not sent.", toUserId);
        }
    }
}
