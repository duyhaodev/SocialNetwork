package com.DuyHao.post_service.repository;

import com.DuyHao.post_service.entity.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportRepository extends JpaRepository<Report, String> {
    Page<Report> findByStatus(String status, Pageable pageable);
}
