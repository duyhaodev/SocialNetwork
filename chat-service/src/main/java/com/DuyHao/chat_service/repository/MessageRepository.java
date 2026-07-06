package com.DuyHao.chat_service.repository;

import com.DuyHao.chat_service.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends MongoRepository<Message, String> {

    Page<Message> findAllByConversationIdOrderByCreatedAtDesc(String conversationId, Pageable pageable);

    Optional<Message> findFirstByConversationIdAndSenderIdOrderByCreatedAtDesc(String conversationId, String senderId);

    // Search theo keyword — case-insensitive, bỏ qua tin đã thu hồi và tin hệ thống
    @Query("{ 'conversationId': ?0, 'content': { $regex: ?1, $options: 'i' }, 'isRevoked': false, 'type': null }")
    Page<Message> searchByKeywordInConversation(String conversationId, String keyword, Pageable pageable);

    // Đếm tin mới hơn timestamp → dùng để tính page index
    long countByConversationIdAndCreatedAtAfter(String conversationId, java.time.LocalDateTime after);

    // Tìm tất cả tin nhắn chứa URL (http:// hoặc https://) — bỏ qua tin thu hồi và tin hệ thống
    @Query("{ 'conversationId': ?0, 'content': { $regex: 'https?://', $options: 'i' }, 'isRevoked': false, 'type': null }")
    Page<Message> findLinksByConversationId(String conversationId, Pageable pageable);
}
