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
    PostService postService; // for deleting posts if report is resolved

    public ReportResponse createReport(ReportRequest request) {
        var context = SecurityContextHolder.getContext();
        String userId = context.getAuthentication().getName();

        Report report = reportMapper.toReport(request);
        report.setReporterId(userId);
        report.setStatus("PENDING");
        return reportMapper.toReportResponse(reportRepository.save(report));
    }

    @PreAuthorize("hasRole('ADMIN')")
    public Page<ReportResponse> getPendingReports(Pageable pageable) {
        return reportRepository.findByStatus("PENDING", pageable).map(reportMapper::toReportResponse);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public void resolveReport(String reportId) {
        Report report = reportRepository.findById(reportId).orElseThrow(() -> new RuntimeException("Report not found"));
        report.setStatus("RESOLVED");

        // Optionally, if it's a POST report, we could delete it here or just leave it to the admin
        // Admin might delete the post using a separate endpoint and then mark as resolved.

        reportRepository.save(report);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public void dismissReport(String reportId) {
        Report report = reportRepository.findById(reportId).orElseThrow(() -> new RuntimeException("Report not found"));
        report.setStatus("DISMISSED");
        reportRepository.save(report);
    }
}
