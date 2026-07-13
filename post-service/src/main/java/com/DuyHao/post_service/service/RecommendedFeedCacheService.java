package com.DuyHao.post_service.service;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendedFeedCacheService {

    private final StringRedisTemplate redisTemplate;

    private static final String KEY_PREFIX = "feed:recommended:";

    // Key tự expire sau 30 phút
    private static final long TTL_MINUTES = 30;

    public void savePostIds(String userId, List<String> postIds) {
        if (userId == null || postIds == null || postIds.isEmpty()) return;

        String key = buildKey(userId);
        try {
            // Xóa key cũ trước khi lưu mới
            redisTemplate.delete(key);

            // Lưu toàn bộ list vào Redis (right push — giữ thứ tự)
            redisTemplate.opsForList().rightPushAll(key, postIds);

            // Đặt TTL 30 phút
            redisTemplate.expire(key, TTL_MINUTES, TimeUnit.MINUTES);
            log.debug("Saved {} postIds to Redis key={}", postIds.size(), key);
        } catch (Exception e) {
            log.error("Redis savePostIds failed for userId={}: {}", userId, e.getMessage());
        }
    }

    // ----------------------------------------------------------------
    // Lấy một đoạn postId theo page và size
    // Redis List dùng LRANGE(start, end) — index từ 0
    // ----------------------------------------------------------------
    public List<String> getPostIds(String userId, int page, int size) {
        if (userId == null) return Collections.emptyList();

        String key = buildKey(userId);
        long start = (long) page * size; // page=0 → 0, page=1 → 20
        long end = start + size - 1; // page=0 → 19, page=1 → 39

        try {
            List<String> result = redisTemplate.opsForList().range(key, start, end);
            if (result == null) return Collections.emptyList();
            return result;
        } catch (Exception e) {
            log.error("Redis getPostIds failed for userId={}: {}", userId, e.getMessage());
            return Collections.emptyList();
        }
    }

    public void deleteKey(String userId) {
        if (userId == null) return;
        try {
            redisTemplate.delete(buildKey(userId));
            log.debug("Deleted Redis key for userId={}", userId);
        } catch (Exception e) {
            log.error("Redis deleteKey failed for userId={}: {}", userId, e.getMessage());
        }
    }

    public boolean hasKey(String userId) {
        if (userId == null) return false;
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(buildKey(userId)));
        } catch (Exception e) {
            return false;
        }
    }

    private String buildKey(String userId) {
        return KEY_PREFIX + userId;
    }
}
