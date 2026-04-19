package com.DuyHao.realtime_service.config;

import com.corundumstudio.socketio.AuthorizationResult;
import com.corundumstudio.socketio.SocketIOServer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class SocketIOConfig {

    @Value("${rt-service.socket.host}")
    private String host;

    @Value("${rt-service.socket.port}")
    private Integer port;

    @Bean
    public SocketIOServer socketIOServer(CustomJwtDecoder customJwtDecoder) {
        com.corundumstudio.socketio.Configuration config = new com.corundumstudio.socketio.Configuration();
        config.setHostname(host);
        config.setPort(port);

        // Hỗ trợ CORS
        config.setOrigin("*");

        config.setAuthorizationListener(data -> {
            String token = null;

            // 1. Lấy từ Header Authorization: Bearer <token>
            String authHeader = data.getHttpHeaders().get("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }

            // 2. Lấy từ Query Parameter "token" (hữu ích cho Mobile/Testing)
            if (token == null) {
                token = data.getSingleUrlParam("token");
            }

            if (token == null || token.isEmpty()) {
                log.warn("Socket connection rejected: No token provided");
                return AuthorizationResult.FAILED_AUTHORIZATION;
            }

            try {
                customJwtDecoder.decode(token);
                return AuthorizationResult.SUCCESSFUL_AUTHORIZATION;
            } catch (Exception e) {
                log.error("Socket connection rejected: Invalid token - {}", e.getMessage());
                return AuthorizationResult.FAILED_AUTHORIZATION;
            }
        });

        return new SocketIOServer(config);
    }
}
