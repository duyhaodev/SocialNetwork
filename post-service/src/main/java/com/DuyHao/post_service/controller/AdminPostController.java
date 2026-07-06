package com.DuyHao.post_service.controller;

import com.DuyHao.post_service.dto.ApiResponse;
import com.DuyHao.post_service.dto.request.ReportRequest;
import com.DuyHao.post_service.dto.response.PostResponse;
import com.DuyHao.post_service.dto.response.ReportResponse;
import com.DuyHao.post_service.service.PostService;
import com.DuyHao.post_service.service.ReportService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminPostController {
    PostService postService;
    ReportService reportService;

    // --- REPORT ENDPOINTS ---
    @PostMapping("/reports")
    ApiResponse<ReportResponse> createReport(@RequestBody ReportRequest request) {
        return ApiResponse.<ReportResponse>builder()
                .result(reportService.createReport(request))
                .build();
    }

    @GetMapping("/admin/reports")
    ApiResponse<Page<ReportResponse>> getPendingReports(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.<Page<ReportResponse>>builder()
                .result(reportService.getPendingReports(PageRequest.of(page, size)))
                .build();
    }

    @PutMapping("/admin/reports/{reportId}/resolve")
    ApiResponse<String> resolveReport(@PathVariable String reportId) {
        reportService.resolveReport(reportId);
        return ApiResponse.<String>builder().result("Report resolved").build();
    }

    @PutMapping("/admin/reports/{reportId}/dismiss")
    ApiResponse<String> dismissReport(@PathVariable String reportId) {
        reportService.dismissReport(reportId);
        return ApiResponse.<String>builder().result("Report dismissed").build();
    }

    // --- POST ENDPOINTS ---
    @GetMapping("/admin/posts")
    ApiResponse<Page<PostResponse>> getAllPosts(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.<Page<PostResponse>>builder()
                .result(postService.getAllPosts(PageRequest.of(page, size)))
                .build();
    }

    @DeleteMapping("/admin/posts/{postId}")
    ApiResponse<String> deletePostByAdmin(@PathVariable String postId) {
        postService.deletePostByAdmin(postId);
        return ApiResponse.<String>builder().result("Post deleted by Admin").build();
    }

    @GetMapping("/admin/posts/stats")
    ApiResponse<Long> getPostStats() {
        return ApiResponse.<Long>builder().result(postService.getPostCount()).build();
    }
}
