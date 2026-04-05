package com.DuyHao.media_service.service;

import com.DuyHao.media_service.dto.response.MediaResponse;
import com.DuyHao.media_service.entity.Media;
import com.DuyHao.media_service.mapper.MediaMapper;
import com.DuyHao.media_service.repository.MediaRepository;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class MediaService {

    private final MediaRepository mediaRepository;
    private final Cloudinary cloudinary;
    private final MediaMapper mediaMapper;

    private static final long MAX_MEDIA_SIZE = 20L * 1024 * 1024; // 20MB

    // ==================== UPLOAD 1 FILE ====================
    public MediaResponse upload(MultipartFile file, String postId, String commentId) {
        validateMedia(file);

        try {
            String contentType = file.getContentType();
            boolean isImage = contentType != null && contentType.startsWith("image/");
            boolean isVideo = contentType != null && contentType.startsWith("video/");

            String folder = isImage ? "threads/posts/image" : "threads/posts/video";

            Map<String, Object> uploadResult = cloudinary
                    .uploader()
                    .upload(file.getBytes(), ObjectUtils.asMap("folder", folder, "resource_type", "auto"));

            Media media = Media.builder()
                    .mediaUrl((String) uploadResult.get("secure_url"))
                    .mediaPublicId((String) uploadResult.get("public_id"))
                    .mediaType(isImage ? "image" : "video")
                    .postId(postId)
                    .commentId(commentId)
                    .build();

            mediaRepository.save(media);
            return mediaMapper.toResponse(media);

        } catch (Exception e) {
            throw new RuntimeException("Upload media failed", e);
        }
    }

    // ==================== UPLOAD NHIỀU FILE SONG SONG ====================
    public List<MediaResponse> uploadMultiple(List<MultipartFile> files, String postId, String commentId) {
        if (files == null || files.isEmpty()) return List.of();

        List<MultipartFile> validFiles = files.stream()
                .filter(Objects::nonNull)
                .filter(f -> !f.isEmpty())
                .collect(Collectors.toList());

        validFiles.forEach(this::validateMedia);

        // Upload song song
        List<CompletableFuture<MediaResponse>> futures = validFiles.stream()
                .map(file -> CompletableFuture.supplyAsync(() -> upload(file, postId, commentId)))
                .collect(Collectors.toList());

        return futures.stream()
                .map(CompletableFuture::join)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }
    // gán media cho post
    @Transactional
    public void assignMediaToPost(String postId, List<String> mediaIds) {
        List<Media> mediaList = mediaRepository.findAllByIdIn(mediaIds);
        for (Media media : mediaList) {
            media.setPostId(postId);
        }
        mediaRepository.saveAll(mediaList);
    }
    // Gán media cho comment
    @Transactional
    public void assignMediaToComment(String commentId, List<String> mediaIds) {
        if (mediaIds == null || mediaIds.isEmpty()) return;

        List<Media> mediaList = mediaRepository.findAllByIdIn(mediaIds);
        for (Media media : mediaList) {
            media.setCommentId(commentId);
        }
        mediaRepository.saveAll(mediaList);
    }

    // ==================== GET MEDIA ====================
    public List<MediaResponse> getByPostId(String postId) {
        return mediaMapper.toResponseList(mediaRepository.findByPostId(postId));
    }

    public List<MediaResponse> getByCommentId(String commentId) {
        return mediaMapper.toResponseList(mediaRepository.findByCommentId(commentId));
    }

    // ==================== DELETE MEDIA ====================
    @Async
    public void deleteMedia(Media media) {
        if (media == null || media.getMediaPublicId() == null) return;

        try {
            cloudinary
                    .uploader()
                    .destroy(media.getMediaPublicId(), ObjectUtils.asMap("resource_type", media.getMediaType()));
            mediaRepository.delete(media);
        } catch (Exception e) {
            System.err.println("Delete media failed: " + media.getMediaPublicId());
        }
    }

    public void deleteByPostId(String postId) {
        List<Media> medias = mediaRepository.findByPostId(postId);
        medias.forEach(this::deleteMedia);
    }

    public void deleteByCommentId(String commentId) {
        List<Media> medias = mediaRepository.findByCommentId(commentId);
        medias.forEach(this::deleteMedia);
    }

    // ==================== VALIDATE ====================
    private void validateMedia(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("File trống");

        String contentType = file.getContentType();
        boolean isImage = contentType != null && contentType.startsWith("image/");
        boolean isVideo = contentType != null && contentType.startsWith("video/");

        if (!isImage && !isVideo) throw new IllegalArgumentException("Chỉ hỗ trợ image hoặc video");
        if (file.getSize() > MAX_MEDIA_SIZE) throw new IllegalArgumentException("File quá lớn (tối đa 20MB)");
    }
}
