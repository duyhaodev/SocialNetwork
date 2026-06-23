package com.DuyHao.chat_service.service;

import com.DuyHao.chat_service.dto.response.StreakResponse;
import com.DuyHao.chat_service.entity.Conversation;
import com.DuyHao.chat_service.entity.Streak;
import com.DuyHao.chat_service.repository.ConversationRepository;
import com.DuyHao.chat_service.repository.StreakRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StreakService {

    StreakRepository streakRepository;
    ConversationRepository conversationRepository;
    RedisPublisherService redisPublisherService;
    SystemMessageService systemMessageService;

    static DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");
    static ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public void onMessageSent(String conversationId, String senderId) {
        Streak streak = streakRepository.findByConversationId(conversationId)
                .orElseGet(() -> createNewStreak(conversationId, senderId));
        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        // lastActivityDate = ngày cuối cùng có ai nhắn
        boolean isNewDay = streak.getLastActivityDate() == null
                || !streak.getLastActivityDate().equals(today.toString());

        if (isNewDay) {
            // Ngày mới: reset cả hai cờ
            streak.setUserASentToday(false);
            streak.setUserBSentToday(false);
        }

        // Cập nhật ngày hoạt động gần nhất
        streak.setLastActivityDate(today.toString());

        // Đánh dấu người gửi hôm nay
        if (senderId.equals(streak.getUserAId())) {
            streak.setUserASentToday(true);
        } else {
            streak.setUserBSentToday(true);
        }

        // Nếu cả hai đã gửi hôm nay, hôm nay chưa tăng streak thì tăng
        boolean bothSentToday = streak.isUserASentToday() && streak.isUserBSentToday();
        boolean notYetIncreasedToday = streak.getLastStreakDate() == null
                || !streak.getLastStreakDate().equals(today.toString());

        if (bothSentToday && notYetIncreasedToday) {
            streak.setStreakCount(streak.getStreakCount() + 1);
            streak.setLastStreakDate(today.toString());
            // Khi streak tăng, xóa trạng thái có thể khôi phục (nếu có)
            streak.setCanRestoreUntil(null);
            streak.setBrokenStreakCount(0);
            log.info("[STREAK] Tăng streak lên {} cho conversation {}", streak.getStreakCount(), conversationId);
        }

        streakRepository.save(streak);
    }

    public StreakResponse getStreak(String conversationId) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();

        Streak streak = streakRepository.findByConversationId(conversationId)
                .orElse(null);

        // Chưa có streak record = chưa ai nhắn
        if (streak == null) {
            return StreakResponse.builder()
                    .streakCount(0)
                    .iSentToday(false)
                    .partnerSentToday(false)
                    .canRestore(false)
                    .brokenStreakCount(0)
                    .restoreRemaining(3)
                    .build();
        }

        // Xác định current user là A hay B để map đúng iSentToday / partnerSentToday
        boolean isUserA = currentUserId.equals(streak.getUserAId());
        boolean iSentToday = isUserA ? streak.isUserASentToday() : streak.isUserBSentToday();
        boolean partnerSentToday = isUserA ? streak.isUserBSentToday() : streak.isUserASentToday();

        // Kiểm tra còn trong hạn khôi phục không
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        boolean canRestore = streak.getCanRestoreUntil() != null
                && !today.isAfter(LocalDate.parse(streak.getCanRestoreUntil()))
                && streak.getBrokenStreakCount() > 0
                && streak.getRestoreUsedThisMonth() < 3;

        int restoreRemaining = Math.max(0, 3 - streak.getRestoreUsedThisMonth());

        return StreakResponse.builder()
                .streakCount(streak.getStreakCount())
                .lastStreakDate(streak.getLastStreakDate())
                .iSentToday(iSentToday)
                .partnerSentToday(partnerSentToday)
                .canRestore(canRestore)
                .canRestoreUntil(streak.getCanRestoreUntil())
                .brokenStreakCount(streak.getBrokenStreakCount())
                .restoreRemaining(restoreRemaining)
                .build();
    }

    public StreakResponse restoreStreak(String conversationId) {
        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();

        Streak streak = streakRepository.findByConversationId(conversationId)
                .orElseThrow(() -> new RuntimeException("Streak not found"));

        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        String currentMonth = YearMonth.now(VIETNAM_ZONE).format(MONTH_FORMATTER);

        // Kiểm tra còn hạn khôi phục không
        if (streak.getCanRestoreUntil() == null || today.isAfter(LocalDate.parse(streak.getCanRestoreUntil()))) {
            throw new RuntimeException("Đã hết hạn khôi phục streak");
        }

        // Kiểm tra streak đã bị reset về 0 chưa (phải > 0 khi lưu brokenStreakCount)
        if (streak.getBrokenStreakCount() <= 0) {
            throw new RuntimeException("Không có streak để khôi phục");
        }

        // Reset nếu sang tháng mới
        if (!currentMonth.equals(streak.getRestoreResetMonth())) {
            streak.setRestoreUsedThisMonth(0);
            streak.setRestoreResetMonth(currentMonth);
        }

        // Kiểm tra còn lượt khôi phục không
        if (streak.getRestoreUsedThisMonth() >= 3) {
            throw new RuntimeException("Đã dùng hết 3 lần khôi phục trong tháng này");
        }

        // Thực hiện khôi phục
        streak.setStreakCount(streak.getBrokenStreakCount());
        streak.setRestoreUsedThisMonth(streak.getRestoreUsedThisMonth() + 1);
        streak.setRestoreResetMonth(currentMonth);
        streak.setBrokenStreakCount(0);
        streak.setCanRestoreUntil(null);
        streak.setLastStreakDate(today.toString());

        // Set cả hai đã nhắn hôm nay — không cần nhắn lại để giữ streak ngày khôi phục
        streak.setUserASentToday(true);
        streak.setUserBSentToday(true);
        streak.setLastActivityDate(today.toString());

        streakRepository.save(streak);

        log.info("[STREAK] User {} khôi phục streak về {} cho conversation {}",
                currentUserId, streak.getStreakCount(), conversationId);

        // Gửi system message "Streak đã được khôi phục 🔥. Còn X lần trong tháng này."
        int remaining = Math.max(0, 3 - streak.getRestoreUsedThisMonth());
        systemMessageService.send(
                conversationId,
                "Streak đã được khôi phục 🔥. Còn có thể khôi phục " + remaining + " lần trong tháng này.",
                "SYSTEM_STREAK_RESTORED"
        );

        return getStreak(conversationId);
    }

    // ==================== SCHEDULED JOBS ====================

    /**
     * Chạy khi server vừa start — xử lý các streak đã expired trong thời gian server tắt.
     */
    @jakarta.annotation.PostConstruct
    public void checkExpiredStreaksOnStartup() {
        log.info("[STREAK] Server startup — kiểm tra streak expired...");
        resetExpiredStreaks();
    }

    @Scheduled(cron = "0 0 0 * * *")
    public void resetExpiredStreaks() {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        LocalDate yesterday = today.minusDays(1);

        // Mất streak khi lastStreakDate < yesterday
        // Tức là hôm qua cả hai không cùng nhắn đủ điều kiện tăng streak
        // Ví dụ: lastStreakDate=05/06, đến 00:00 07/06: yesterday=06/06, 05/06 < 06/06 → mất ✅
        //        lastStreakDate=06/06, đến 00:00 07/06: yesterday=06/06, 06/06 = yesterday → giữ ✅
        List<Streak> expiredStreaks = streakRepository
                .findAllByLastStreakDateBeforeOrLastStreakDateIsNull(yesterday.toString());

        int resetCount = 0;
        for (Streak streak : expiredStreaks) {
            // Chỉ reset nếu đang có streak > 0
            if (streak.getStreakCount() > 0) {
                int lostCount = streak.getStreakCount();
                streak.setBrokenStreakCount(lostCount);
                streak.setStreakCount(0);
                streak.setCanRestoreUntil(today.toString());
                resetCount++;
                log.info("[STREAK] Reset streak {} cho conversation {}",
                        lostCount, streak.getConversationId());

                // Gửi system message "Đã mất Streak X ngày 🔥"
                systemMessageService.send(
                        streak.getConversationId(),
                        "Đã mất Streak " + lostCount + " ngày 🔥",
                        "SYSTEM_STREAK_LOST"
                );
            }

            // Reset cờ sent hàng ngày cho tất cả
            streak.setUserASentToday(false);
            streak.setUserBSentToday(false);
        }

        streakRepository.saveAll(expiredStreaks);
        log.info("[STREAK] Đã reset {} streak lúc 00:00", resetCount);
    }

    @Scheduled(cron = "0 0 0 1 * *")
    public void resetMonthlyRestoreQuota() {
        String currentMonth = YearMonth.now(VIETNAM_ZONE).format(MONTH_FORMATTER);

        List<Streak> streaksToReset = streakRepository.findAllByRestoreResetMonthNot(currentMonth);

        for (Streak streak : streaksToReset) {
            streak.setRestoreUsedThisMonth(0);
            streak.setRestoreResetMonth(currentMonth);
        }

        streakRepository.saveAll(streaksToReset);
        log.info("[STREAK] Đã reset quota khôi phục tháng {} cho {} cặp", currentMonth, streaksToReset.size());
    }

    // ==================== PRIVATE HELPERS ====================

    private Streak createNewStreak(String conversationId, String senderId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        // Chỉ tạo streak cho chat DIRECT (2 người)
        if (!"DIRECT".equals(conversation.getType())) {
            throw new RuntimeException("Streak chỉ áp dụng cho chat DIRECT");
        }

        List<String> participantIds = conversation.getParticipants()
                .stream()
                .map(Conversation.Participant::getUserId)
                .toList();

        if (participantIds.size() != 2) {
            throw new RuntimeException("Conversation DIRECT phải có đúng 2 người");
        }

        String currentMonth = YearMonth.now(VIETNAM_ZONE).format(MONTH_FORMATTER);

        return Streak.builder()
                .conversationId(conversationId)
                .userAId(participantIds.get(0))
                .userBId(participantIds.get(1))
                .streakCount(0)
                .userASentToday(false)
                .userBSentToday(false)
                .restoreUsedThisMonth(0)
                .restoreResetMonth(currentMonth)
                .build();
    }
}
