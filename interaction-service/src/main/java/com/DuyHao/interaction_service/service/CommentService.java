package com.DuyHao.interaction_service.service;

import com.DuyHao.interaction_service.FeignClient.MediaClient;
import com.DuyHao.interaction_service.FeignClient.UserClient;
import com.DuyHao.interaction_service.dto.request.CommentRequest;
import com.DuyHao.interaction_service.dto.response.CommentResponse;
import com.DuyHao.interaction_service.dto.response.MediaResponse;
import com.DuyHao.interaction_service.dto.response.UserResponse;
import com.DuyHao.interaction_service.entity.Comment;
import com.DuyHao.interaction_service.mapper.CommentMapper;
import com.DuyHao.interaction_service.repository.CommentRepository;
import com.DuyHao.interaction_service.repository.LikeRepository;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService {
    private final CommentRepository commentRepository;
    private final LikeRepository likeRepository;
    private final CommentMapper commentMapper;

    private final UserClient userClient;
    private final MediaClient mediaClient;

    // ================= CREATE =================
    @Transactional
    public CommentResponse create(String userId, CommentRequest request) {
        if (request.getParentId() != null) {
            commentRepository
                    .findById(request.getParentId())
                    .orElseThrow(() -> new RuntimeException("Parent comment không tồn tại"));
        }

        Comment comment = Comment.builder()
                .postId(request.getPostId())
                .userId(userId)
                .content(request.getContent())
                .parentId(request.getParentId())
                .createdAt(LocalDateTime.now())
                .build();

        comment = commentRepository.saveAndFlush(comment);

        List<String> mediaUrls = new ArrayList<>();
        if (request.getMediaIds() != null && !request.getMediaIds().isEmpty()) {
            mediaClient.assignMediaToComment(comment.getId(), request.getMediaIds());

            try {
                mediaUrls = mediaClient.getMediaByCommentId(comment.getId()).stream()
                        .map(MediaResponse::getMediaUrl)
                        .toList();
            } catch (Exception e) {
                System.err.println("Lỗi lấy Media sau khi gán: " + e.getMessage());
            }
        }
        UserResponse user = userClient.getUser(userId);
        return commentMapper.toResponse(comment, user, mediaUrls, 0, false);
    }

    // ================= GET ROOT COMMENTS (Chỉ lấy comment gốc) =================
    public List<CommentResponse> getCommentsByPost(String postId, String currentUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Comment> commentPage =
                commentRepository.findByPostIdAndParentIdIsNullOrderByCreatedAtDesc(postId, pageable);

        return buildCommentResponses(commentPage.getContent(), currentUserId);
    }
    // ================= GET REPLIES (Lấy danh sách phản hồi) =================
    public List<CommentResponse> getReplies(String parentId, String currentUserId) {
        List<Comment> replies = commentRepository.findByParentIdOrderByCreatedAtAsc(parentId);

        return buildCommentResponses(replies, currentUserId);
    }

    // ================= HELPER  =================
    private List<CommentResponse> buildCommentResponses(List<Comment> comments, String currentUserId) {
        if (comments.isEmpty()) return Collections.emptyList();

        Set<String> userIds = comments.stream().map(Comment::getUserId).collect(Collectors.toSet());
        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds)).stream()
                .collect(Collectors.toMap(UserResponse::getUserId, u -> u));

        return comments.stream()
                .map(c -> {
                    UserResponse user = userMap.get(c.getUserId());
                    List<String> mediaUrls = new ArrayList<>();
                    try {
                        mediaUrls = mediaClient.getMediaByCommentId(c.getId()).stream()
                                .map(MediaResponse::getMediaUrl)
                                .toList();
                    } catch (Exception e) {
                        System.err.println("Lỗi gọi Media cho Comment " + c.getId());
                    }
                    long likeCount = likeRepository.countByCommentId(c.getId());
                    boolean liked = currentUserId != null
                            && likeRepository.existsByUserIdAndCommentId(currentUserId, c.getId());

                    return commentMapper.toResponse(c, user, mediaUrls, likeCount, liked);
                })
                .toList();
    }

    public Comment getCommentById(String id) {
        return commentRepository
                .findById(id)
                .orElseThrow(() -> new RuntimeException("Comment không tồn tại với ID: " + id));
    }

    // ================= DELETE =================
    @Transactional
    public void deleteComment(String currentUserId, String commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getUserId().equals(currentUserId)) {
            throw new RuntimeException("Không có quyền xóa");
        }
        commentRepository.delete(comment);
        CompletableFuture.runAsync(() -> {
            try {
                mediaClient.deleteMediaByCommentId(commentId);
            } catch (Exception e) {
                System.err.println("Lỗi xóa media async cho comment: " + e.getMessage());
            }
        });
    }
}
