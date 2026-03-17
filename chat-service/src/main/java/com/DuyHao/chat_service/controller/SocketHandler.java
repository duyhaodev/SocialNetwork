package com.DuyHao.chat_service.controller;

import com.DuyHao.chat_service.configuration.CustomJwtDecoder;
import com.DuyHao.chat_service.entity.WebSocketSession;
import com.DuyHao.chat_service.repository.WebSocketSessionRepository;
import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.annotation.OnConnect;
import com.corundumstudio.socketio.annotation.OnDisconnect;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SocketHandler {
    SocketIOServer server;
    CustomJwtDecoder customJwtDecoder;
    WebSocketSessionRepository webSocketSessionRepository;

    @OnConnect
    public void onConnect(SocketIOClient client) {
        try {
            // Lấy token từ URL param (ví dụ: ws://localhost:8085?token=...)
            String token = client.getHandshakeData().getSingleUrlParam("token");
            if (token == null || token.isBlank()) {
                log.warn("Missing token for connection: {}", client.getSessionId());
                client.disconnect();
                return;
            }

            // Giải mã Token để lấy userId (thường là subject trong JWT)
            Jwt jwt = customJwtDecoder.decode(token);
            String userId = jwt.getSubject();

            // Lưu userId vào thuộc tính của client để dùng khi ngắt kết nối
            client.set("userId", userId);

            // Kiểm tra trạng thái online hiện tại (có session nào khác của user này chưa?)
            boolean wasAlreadyOnline = webSocketSessionRepository.countByUserId(userId) > 0;

            // Lưu session hiện tại vào MongoDB
            WebSocketSession session = WebSocketSession.builder()
                    .socketSessionId(client.getSessionId().toString())
                    .userId(userId)
                    .createdAt(LocalDateTime.now())
                    .build();
            webSocketSessionRepository.save(session);

            // Gửi danh sách online hiện tại cho người mới kết nối (nếu cần)
            List<WebSocketSession> sessions = webSocketSessionRepository.findAllActiveUserIds();
            List<String> onlineUserIds = sessions.stream()
                    .map(WebSocketSession::getUserId)
                    .distinct()
                    .toList();
            client.sendEvent("online_users_list", onlineUserIds);

            // Thông báo cho tất cả nếu trạng thái của user thay đổi từ Offline sang Online
            if (!wasAlreadyOnline) {
                server.getBroadcastOperations().sendEvent("user_status_change",
                        Map.of("userId", userId, "status", "online"));
            }

            log.info("User {} connected with session ID {}", userId, client.getSessionId());

        } catch (Exception e) {
            log.error("Authentication failed for session {}: {}", client.getSessionId(), e.getMessage());
            client.disconnect();
        }
    }

    @OnDisconnect
    public void onDisconnect(SocketIOClient client) {
        String userId = client.get("userId");
        String sessionId = client.getSessionId().toString();

        // Xóa session khỏi MongoDB
        webSocketSessionRepository.deleteBySocketSessionId(sessionId);

        if (userId != null) {
            // Kiểm tra xem đây có phải là session cuối cùng không
            boolean isStillOnline = webSocketSessionRepository.countByUserId(userId) > 0;

            // Nếu không còn session nào, báo trạng thái Offline
            if (!isStillOnline) {
                server.getBroadcastOperations().sendEvent("user_status_change",
                        Map.of("userId", userId, "status", "offline"));
            }
        }
        log.info("Session {} disconnected for user {}", sessionId, userId);
    }

    @PostConstruct
    public void startServer() {
        server.start();
        server.addListeners(this);
    }

    @PreDestroy
    public void stopServer() {
        server.stop();
    }
}
