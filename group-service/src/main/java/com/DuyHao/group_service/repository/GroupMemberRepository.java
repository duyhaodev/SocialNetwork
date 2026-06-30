package com.DuyHao.group_service.repository;

import com.DuyHao.group_service.entity.GroupMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, String> {
    Optional<GroupMember> findByGroupIdAndUserId(String groupId, String userId);
    List<GroupMember> findByGroupId(String groupId);
    List<GroupMember> findByGroupIdAndRole(String groupId, String role);
    List<GroupMember> findByUserId(String userId);
}
