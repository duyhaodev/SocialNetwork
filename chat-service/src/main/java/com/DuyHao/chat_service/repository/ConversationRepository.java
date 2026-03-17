package com.DuyHao.chat_service.repository;

import com.DuyHao.chat_service.entity.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends MongoRepository<Conversation, String> {
    Optional<Conversation> findByParticipantsHash(String participantsHash);

    // Tìm tất cả hội thoại mà userId này tham gia
    @Query("{ 'participants.userId': ?0 }")
    List<Conversation> findAllByParticipantUserId(String userId);
}
