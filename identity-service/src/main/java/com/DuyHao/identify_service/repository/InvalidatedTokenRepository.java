package com.DuyHao.identify_service.repository;

import com.DuyHao.identify_service.entity.InvalidatedToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvalidatedTokenRepository extends JpaRepository<InvalidatedToken, String>{

}
