package com.DuyHao.interaction_service.controller;

import com.DuyHao.interaction_service.dto.ApiResponse;
import com.DuyHao.interaction_service.dto.response.CommentResponse;
import com.DuyHao.interaction_service.service.CommentService;
import java.util.List;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/comments")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminInteractionController {
    CommentService commentService;

    @GetMapping
    ApiResponse<Page<CommentResponse>> getAllComments(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.<Page<CommentResponse>>builder()
                .result(commentService.getAllComments(PageRequest.of(page, size)))
                .build();
    }

    @GetMapping("/post/{postId}")
    ApiResponse<List<CommentResponse>> getCommentsByPostForAdmin(
            @PathVariable String postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ApiResponse.<List<CommentResponse>>builder()
                .result(commentService.getCommentsByPostForAdmin(postId, page, size))
                .build();
    }

    @DeleteMapping("/{commentId}")
    ApiResponse<String> deleteCommentByAdmin(@PathVariable String commentId) {
        commentService.deleteCommentByAdmin(commentId);
        return ApiResponse.<String>builder().result("Comment hidden by Admin").build();
    }

    @PutMapping("/{commentId}/restore")
    ApiResponse<String> restoreCommentByAdmin(@PathVariable String commentId) {
        commentService.restoreCommentByAdmin(commentId);
        return ApiResponse.<String>builder().result("Comment restored by Admin").build();
    }

    @GetMapping("/stats")
    ApiResponse<Long> getCommentStats() {
        return ApiResponse.<Long>builder()
                .result(commentService.getCommentCount())
                .build();
    }
}
