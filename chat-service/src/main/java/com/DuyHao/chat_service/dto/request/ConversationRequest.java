package com.DuyHao.chat_service.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConversationRequest {
    String type; // DIRECT, GROUP
    List<String> participantIds;
}
