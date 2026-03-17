package com.DuyHao.chat_service.repository;

import com.DuyHao.chat_service.entity.WebSocketSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WebSocketSessionRepository extends MongoRepository<WebSocketSession, String> {
    Optional<WebSocketSession> findBySocketSessionId(String socketSessionId);
    List<WebSocketSession> findAllByUserId(String userId);
    List<WebSocketSession> findAllByUserIdIn(List<String> userIds);
    void deleteBySocketSessionId(String socketSessionId);
    long countByUserId(String userId);

    @Query(value = "{ 'userId': { $exists: true } }", fields = "{ 'userId': 1 }")
    List<WebSocketSession> findAllActiveUserIds();
}
