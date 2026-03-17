package com.DuyHao.chat_service.repository;

import com.DuyHao.chat_service.entity.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findAllByConversationIdOrderByCreatedAtDesc(String conversationId);
}
