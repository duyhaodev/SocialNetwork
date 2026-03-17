package com.DuyHao.chat_service.configuration;

import com.corundumstudio.socketio.SocketIOServer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SocketIOConfig {
    @Value("${app.socket.port:8085}")
    private int port;

    @Value("${app.socket.host:localhost}")
    private String host;

    @Bean
    public SocketIOServer socketIOServer() {
        com.corundumstudio.socketio.Configuration configuration = new com.corundumstudio.socketio.Configuration();
        configuration.setHostname(host);
        configuration.setPort(port);
        configuration.setOrigin("*"); // Cho phép mọi nguồn kết nối (CORS)

        return new SocketIOServer(configuration);
    }
}
