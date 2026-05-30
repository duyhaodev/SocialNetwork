package com.DuyHao.post_service.service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class LocalFeedCacheService {

    private final StringRedisTemplate redisTemplate;

    // Key pattern: posts:local:{cityKey}
    private static final String KEY_PREFIX = "posts:local:";

    // Chỉ giữ bài trong 30 ngày gần nhất trên Redis
    private static final long KEEP_DAYS = 30;

    // Key tự expire sau 48h nếu không có activity
    private static final long KEY_TTL_HOURS = 48;

    // Thêm bài mới vào Redis ZSET của tỉnh, score = thời gian đăng, tự động dọn bài cũ hơn 30 ngày
    public void addPost(String city, String postId, LocalDateTime createdAt) {
        if (city == null || city.isBlank() || "Unknown".equals(city)) return;

        String key = buildKey(city);
        double score = createdAt.toInstant(ZoneOffset.UTC).toEpochMilli();

        try {
            ZSetOperations<String, String> zset = redisTemplate.opsForZSet();
            zset.add(key, postId, score);

            // Xóa bài cũ hơn 30 ngày
            long cutoff = LocalDateTime.now()
                    .minusDays(KEEP_DAYS)
                    .toInstant(ZoneOffset.UTC)
                    .toEpochMilli();
            zset.removeRangeByScore(key, 0, cutoff);

            // Reset TTL mỗi lần có bài mới
            redisTemplate.expire(key, KEY_TTL_HOURS, TimeUnit.HOURS);

            log.debug("Added postId={} to Redis key={}", postId, key);
        } catch (Exception e) {
            // Không để Redis lỗi crash luồng đăng bài
            log.error("Redis addPost failed for city={}: {}", city, e.getMessage());
        }
    }

    // Xóa bài khỏi Redis ZSET khi user xóa bài viết
    public void removePost(String city, String postId) {
        if (city == null || city.isBlank() || "Unknown".equals(city)) return;

        try {
            redisTemplate.opsForZSet().remove(buildKey(city), postId);
            log.debug("Removed postId={} from Redis key={}", postId, buildKey(city));
        } catch (Exception e) {
            log.error("Redis removePost failed for city={}: {}", city, e.getMessage());
        }
    }

    // Lấy danh sách postId theo trang từ Redis ZSET, sắp xếp từ mới đến cũ
    public List<String> getPostIds(String city, int page, int size) {
        if (city == null || city.isBlank()) return Collections.emptyList();

        String key = buildKey(city);
        long start = (long) page * size;
        long end = start + size - 1;

        try {
            Set<String> result = redisTemplate.opsForZSet().reverseRange(key, start, end);
            if (result == null || result.isEmpty()) return Collections.emptyList();
            return List.copyOf(result);
        } catch (Exception e) {
            log.error("Redis getPostIds failed for city={}: {}", city, e.getMessage());
            return Collections.emptyList();
        }
    }

    // Chuyển tên city thành Redis key hợp lệ (bỏ khoảng trắng)
    private String buildKey(String city) {
        String normalized = city.trim().replaceAll("\\s+", "");
        return KEY_PREFIX + normalized;
    }
}
