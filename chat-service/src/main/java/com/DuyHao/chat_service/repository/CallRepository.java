package com.DuyHao.chat_service.repository;

import com.DuyHao.chat_service.entity.CallSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CallRepository extends MongoRepository<CallSession, String> {
}
