package com.DuyHao.chat_service.repository.httpClient;

import com.DuyHao.chat_service.configuration.AuthenticationRequestInterceptor;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "media-service", url = "${app.service.media}",
        configuration = { AuthenticationRequestInterceptor.class })
public interface MediaClient {
    @PutMapping(value = "/internal/media/assign/conversation")
    void assignMediaToConversation(@RequestParam("conversationId") String conversationId, 
                                   @RequestBody List<String> mediaIds);
}
