package com.DuyHao.group_service.repository;

import com.DuyHao.group_service.entity.GroupReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupReportRepository extends JpaRepository<GroupReport, String> {
    List<GroupReport> findByGroupIdAndStatusOrderByCreatedAtDesc(String groupId, String status);
}
