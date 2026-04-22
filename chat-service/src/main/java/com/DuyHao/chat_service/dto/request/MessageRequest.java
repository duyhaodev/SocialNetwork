package com.DuyHao.chat_service.dto.request;

import com.DuyHao.chat_service.entity.MediaInfo;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MessageRequest {
    String conversationId;
    String content;
    List<MediaInfo> media;
}
