package com.DuyHao.post_service.service;

import com.DuyHao.post_service.dto.request.ReportRequest;
import com.DuyHao.post_service.dto.response.ReportResponse;
import com.DuyHao.post_service.entity.Report;
import com.DuyHao.post_service.mapper.ReportMapper;
import com.DuyHao.post_service.repository.ReportRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReportService {
    ReportRepository reportRepository;
    ReportMapper reportMapper;
    com.DuyHao.post_service.repository.PostRepository postRepository;
    com.DuyHao.post_service.FeignClient.UserClient userClient;
    com.DuyHao.post_service.FeignClient.MediaClient mediaClient;
    com.DuyHao.post_service.FeignClient.NotificationClient notificationClient;

    public ReportResponse createReport(ReportRequest request) {
        var context = SecurityContextHolder.getContext();
        String userId = context.getAuthentication().getName();

        Report report = reportMapper.toReport(request);
        report.setReporterId(userId);
        report.setStatus("PENDING");
        return reportMapper.toReportResponse(reportRepository.save(report), null, null, null);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public Page<ReportResponse> getPendingReports(Pageable pageable) {
        return reportRepository.findByStatus("PENDING", pageable).map(report -> {
            com.DuyHao.post_service.dto.response.UserResponse user = null;
            try {
                user = userClient.getUser(report.getReporterId());
            } catch (Exception e) {
            }

            com.DuyHao.post_service.entity.Post post = null;
            java.util.List<String> mediaUrls = new java.util.ArrayList<>();
            if ("POST".equals(report.getTargetType())) {
                post = postRepository.findById(report.getTargetId()).orElse(null);
                if (post != null) {
                    try {
                        mediaUrls = mediaClient.getMediaByPostId(post.getId()).stream()
                                .map(com.DuyHao.post_service.dto.response.MediaResponse::getMediaUrl)
                                .toList();
                    } catch (Exception e) {
                    }
                }
            }
            return reportMapper.toReportResponse(report, user, post, mediaUrls);
        });
    }

    @PreAuthorize("hasRole('ADMIN')")
    public void resolveReport(String reportId, String actionReason) {
        Report report = reportRepository.findById(reportId).orElseThrow(() -> new RuntimeException("Report not found"));
        report.setStatus("RESOLVED");
        reportRepository.save(report);

        if ("POST".equals(report.getTargetType())) {
            com.DuyHao.post_service.entity.Post post =
                    postRepository.findById(report.getTargetId()).orElse(null);
            if (post != null) {
                post.setStatus("HIDDEN");
                post.setStatusReason(actionReason);
                postRepository.save(post);

                // Notify post author
                try {
                    notificationClient.postHiddenByAdmin(post.getUserId(), post.getId(), actionReason);
                } catch (Exception e) {
                    // Ignore notification errors
                }
            }
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    public void dismissReport(String reportId) {
        Report report = reportRepository.findById(reportId).orElseThrow(() -> new RuntimeException("Report not found"));
        report.setStatus("DISMISSED");
        reportRepository.save(report);
    }
}
