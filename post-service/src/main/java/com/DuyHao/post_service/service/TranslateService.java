package com.DuyHao.post_service.service;

import com.DuyHao.post_service.dto.request.TranslateRequest;
import com.DuyHao.post_service.dto.response.TranslateResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
public class TranslateService {

    @Value("${deepl.api-key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String DEEPL_URL = "https://api-free.deepl.com/v2/translate";

    public TranslateResponse translate(TranslateRequest request) {
        try {
            // Set header Authorization
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "DeepL-Auth-Key " + apiKey);

            // Dùng ObjectMapper để build body — an toàn với emoji, ký tự đặc biệt, xuống dòng
            ObjectNode bodyNode = objectMapper.createObjectNode();
            ArrayNode textArray = objectMapper.createArrayNode();
            textArray.add(request.getText()); // ObjectMapper tự escape đúng cách
            bodyNode.set("text", textArray);
            bodyNode.put("target_lang", request.getTargetLang());
            String body = objectMapper.writeValueAsString(bodyNode);

            HttpEntity<String> entity = new HttpEntity<>(body, headers);

            // Gọi DeepL API
            ResponseEntity<String> response = restTemplate.exchange(DEEPL_URL, HttpMethod.POST, entity, String.class);

            // Parse response
            return parseResponse(response.getBody());

        } catch (Exception e) {
            log.error("DeepL translate failed: {}", e.getMessage());
            throw new RuntimeException("Dịch thất bại: " + e.getMessage());
        }
    }

    // Parse JSON response từ DeepL
    private TranslateResponse parseResponse(String json) throws Exception {
        JsonNode root = objectMapper.readTree(json);
        JsonNode first = root.path("translations").get(0);

        return TranslateResponse.builder()
                .translatedText(first.path("text").asText())
                .detectedSourceLang(first.path("detected_source_language").asText())
                .build();
    }
}
