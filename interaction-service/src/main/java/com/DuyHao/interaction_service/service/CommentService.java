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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final LikeRepository likeRepository;
    private final CommentMapper commentMapper;

    private final UserClient userClient;
    private final MediaClient mediaClient;

    // ================= CREATE =================
    public CommentResponse create(String userId, CommentRequest request) {

        // validate reply
        if (request.getParentId() != null) {
            Comment parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new RuntimeException("Parent comment không tồn tại"));

            if (!parent.getPostId().equals(request.getPostId())) {
                throw new RuntimeException("Reply không hợp lệ");
            }
        }

        Comment comment = Comment.builder()
                .postId(request.getPostId())
                .userId(userId)
                .content(request.getContent())
                .parentId(request.getParentId())
                .createdAt(LocalDateTime.now())
                .mediaIds(
                        request.getMediaIds() != null
                                ? request.getMediaIds()
                                : new ArrayList<>()
                )
                .build();

        comment = commentRepository.save(comment);

        // lấy user
        UserResponse user = userClient.getUser(userId);

        return commentMapper.toResponse(
                comment,
                user,
                List.of(), // create chưa cần load media
                0,
                false
        );
    }

    // ================= GET COMMENTS =================
    public List<CommentResponse> getCommentsByPost(String postId, String currentUserId, int page, int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Comment> commentPage = commentRepository.findByPostIdOrderByCreatedAtDesc(postId, pageable);

        List<Comment> comments = commentPage.getContent();

        // 🔥 batch user (giống PostService)
        Set<String> userIds = comments.stream()
                .map(Comment::getUserId)
                .collect(Collectors.toSet());

        Map<String, UserResponse> userMap = userClient.getUsers(new ArrayList<>(userIds))
                .stream()
                .collect(Collectors.toMap(UserResponse::getId, u -> u));

        return comments.stream()
                .map(c -> {

                    UserResponse user = userMap.get(c.getUserId());

                    // 🔥 media giống PostService
                    List<String> mediaUrls = Optional.ofNullable(c.getMediaIds())
                            .orElse(List.of())
                            .stream()
                            .map(mediaClient::getMediaById)
                            .filter(Objects::nonNull)
                            .map(MediaResponse::getMediaUrl)
                            .toList();

                    // interaction
                    long likeCount = likeRepository.countByCommentId(c.getId());

                    boolean liked = currentUserId != null &&
                            likeRepository.existsByUserIdAndCommentId(currentUserId, c.getId());

                    return commentMapper.toResponse(
                            c,
                            user,
                            mediaUrls,
                            likeCount,
                            liked
                    );
                })
                .toList();
    }

    // ================= DELETE =================
    @Transactional
    public void deleteComment(String currentUserId, String commentId) {

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getUserId().equals(currentUserId)) {
            throw new RuntimeException("Không có quyền xóa");
        }

        // 🔥 xóa media qua media-service
        Optional.ofNullable(comment.getMediaIds())
                .orElse(List.of())
                .forEach(mediaClient::deleteMedia);

        commentRepository.delete(comment);
    }
}