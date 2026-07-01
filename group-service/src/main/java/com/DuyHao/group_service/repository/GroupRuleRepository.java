package com.DuyHao.group_service.repository;

import com.DuyHao.group_service.entity.GroupRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupRuleRepository extends JpaRepository<GroupRule, String> {
    List<GroupRule> findByGroupIdOrderByOrderIndexAsc(String groupId);
    void deleteByGroupId(String groupId);
}
