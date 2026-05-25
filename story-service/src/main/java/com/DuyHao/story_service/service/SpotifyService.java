package com.DuyHao.story_service.service;

import com.DuyHao.story_service.dto.response.MusicSearchResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

// Dùng iTunes Search API — miễn phí, không cần đăng ký, có preview 30s
@Slf4j
@Service
public class SpotifyService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    public List<MusicSearchResponse> search(String query) {
        try {
            String encodedQuery = query.replace(" ", "+");
            String url = "https://itunes.apple.com/search?term=" + encodedQuery
                    + "&media=music&entity=song&limit=15&country=VN";

            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            return parseResult(response.getBody());
        } catch (Exception e) {
            log.error("iTunes search failed: {}", e.getMessage());
            return List.of();
        }
    }

    private List<MusicSearchResponse> parseResult(String json) {
        List<MusicSearchResponse> results = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode items = root.path("results");

            for (JsonNode item : items) {
                // iTunes luôn có previewUrl 30s
                String previewUrl = item.path("previewUrl").asText(null);
                String title = item.path("trackName").asText(null);
                String artist = item.path("artistName").asText(null);
                String albumArt = item.path("artworkUrl100").asText(null);

                if (title == null || artist == null) continue;

                results.add(MusicSearchResponse.builder()
                        .title(title)
                        .artist(artist)
                        .albumArt(albumArt)
                        .previewUrl(previewUrl)
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to parse iTunes response: {}", e.getMessage());
        }
        return results;
    }
}
