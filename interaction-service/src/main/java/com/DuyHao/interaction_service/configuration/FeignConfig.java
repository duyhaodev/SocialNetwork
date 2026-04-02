package com.DuyHao.interaction_service.configuration;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import feign.RequestInterceptor;
import feign.RequestTemplate;

@Configuration
public class FeignConfig {

    @Bean
    public RequestInterceptor requestInterceptor() {
        return new RequestInterceptor() {
            @Override
            public void apply(RequestTemplate template) {

                ServletRequestAttributes attributes =
                        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

                if (attributes == null) return;

                HttpServletRequest request = attributes.getRequest();

                // Lấy Authorization header từ request gốc
                String authHeader = request.getHeader("Authorization");

                if (authHeader != null && !authHeader.isEmpty()) {
                    template.header("Authorization", authHeader);
                }
            }
        };
    }
}
