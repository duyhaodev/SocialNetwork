package com.DuyHao.api_gateway.repository;

import com.DuyHao.api_gateway.dto.request.IntrospectRequest;
import com.DuyHao.api_gateway.dto.response.IntrospectApiResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.PostExchange;
import reactor.core.publisher.Mono;

public interface IdentityClient {
    @PostExchange(url = "/auth/introspect", contentType = MediaType.APPLICATION_JSON_VALUE)
    Mono<IntrospectApiResponse> introspect(@RequestBody IntrospectRequest introspectRequest);
}
