package com.DuyHao.api_gateway.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class IntrospectApiResponse {
    int code;
    String message;
    IntrospectResponse result;
}
