package com.DuyHao.realtime_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;

@Configuration
public class RedisConfig {

    @Value("${rt-service.redis.channel}")
    private String channel;

    @Bean
    public RedisMessageListenerContainer container(RedisConnectionFactory connectionFactory,
                                                  MessageListenerAdapter listenerAdapter) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(listenerAdapter, new PatternTopic(channel));
        return container;
    }

    @Bean
    public MessageListenerAdapter listenerAdapter(com.DuyHao.realtime_service.service.RedisMessageListener listener) {
        return new MessageListenerAdapter(listener, "onMessageReceived");
    }
}
