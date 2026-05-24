package com.DuyHao.chat_service.repository;

import com.DuyHao.chat_service.entity.CallSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CallRepository extends MongoRepository<CallSession, String> {
    @Query("{ $or: [ { 'callerId': ?0 }, { 'calleeId': ?0 } ], 'status': { $in: ['RINGING', 'IN_PROGRESS'] } }")
    List<CallSession> findActiveSessionsByUserId(String userId);

    List<CallSession> findAllByStatusIn(List<String> statuses);
}
