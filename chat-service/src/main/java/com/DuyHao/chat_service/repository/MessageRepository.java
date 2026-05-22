package com.DuyHao.chat_service.repository;

import com.DuyHao.chat_service.entity.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findAllByConversationIdOrderByCreatedAtDesc(String conversationId);

    Optional<Message> findFirstByConversationIdAndSenderIdOrderByCreatedAtDesc(String conversationId, String senderId);
}
