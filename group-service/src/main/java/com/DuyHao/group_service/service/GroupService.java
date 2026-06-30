package com.DuyHao.group_service.service;

import com.DuyHao.group_service.dto.request.GroupCreateRequest;
import com.DuyHao.group_service.dto.response.GroupMemberResponse;
import com.DuyHao.group_service.dto.response.GroupResponse;
import com.DuyHao.group_service.entity.Group;
import com.DuyHao.group_service.entity.GroupMember;
import com.DuyHao.group_service.mapper.GroupMapper;
import com.DuyHao.group_service.repository.GroupMemberRepository;
import com.DuyHao.group_service.repository.GroupRepository;
import com.DuyHao.group_service.client.NotificationClient;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupMapper groupMapper;
    private final NotificationClient notificationClient;

    @Transactional
    public GroupResponse createGroup(GroupCreateRequest request, String currentUserId) {
        Group group = groupMapper.toGroup(request);
        Group savedGroup = groupRepository.save(group);

        // Creator is Admin
        GroupMember adminMember = GroupMember.builder()
                .groupId(savedGroup.getId())
                .userId(currentUserId)
                .role("ADMIN")
                .build();
        groupMemberRepository.save(adminMember);

        return groupMapper.toGroupResponse(savedGroup);
    }

    public GroupResponse getGroup(String groupId, String currentUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        GroupResponse response = groupMapper.toGroupResponse(group);
        
        if (currentUserId != null && !currentUserId.isEmpty()) {
            Optional<GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId);
            response.setCurrentUserRole(member.isPresent() ? member.get().getRole() : "NONE");
        } else {
            response.setCurrentUserRole("NONE");
        }
        
        return response;
    }

    @Transactional
    public void joinGroup(String groupId, String currentUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        Optional<GroupMember> existingMember = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId);
        if (existingMember.isPresent()) {
            throw new RuntimeException("Already a member or pending");
        }

        String role = group.getPrivacy().equals("PUBLIC") ? "MEMBER" : "PENDING";
        
        GroupMember newMember = GroupMember.builder()
                .groupId(groupId)
                .userId(currentUserId)
                .role(role)
                .build();

        groupMemberRepository.save(newMember);

        if (role.equals("PENDING")) {
            java.util.List<GroupMember> admins = groupMemberRepository.findByGroupIdAndRole(groupId, "ADMIN");
            java.util.List<GroupMember> mods = groupMemberRepository.findByGroupIdAndRole(groupId, "MODERATOR");
            java.util.List<GroupMember> adminsAndMods = new java.util.ArrayList<>();
            adminsAndMods.addAll(admins);
            adminsAndMods.addAll(mods);

            for (GroupMember adminOrMod : adminsAndMods) {
                try {
                    notificationClient.groupJoinRequest(adminOrMod.getUserId(), currentUserId, groupId);
                } catch (Exception e) {
                    log.error("Failed to send group join request notification to {}", adminOrMod.getUserId(), e);
                }
            }
        }
    }

    @Transactional
    public void approveMember(String groupId, String userId, String currentUserId) {
        // Check if currentUserId is ADMIN or MODERATOR
        GroupMember admin = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new RuntimeException("No permission"));
        
        if (!admin.getRole().equals("ADMIN") && !admin.getRole().equals("MODERATOR")) {
            throw new RuntimeException("No permission");
        }

        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new RuntimeException("Member request not found"));

        if (member.getRole().equals("PENDING")) {
            member.setRole("MEMBER");
            groupMemberRepository.save(member);

            try {
                notificationClient.groupJoinApproved(userId, currentUserId, groupId);
            } catch (Exception e) {
                log.error("Failed to send group join approved notification to {}", userId, e);
            }
        }
    }

    @Transactional
    public void leaveGroup(String groupId, String currentUserId) {
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new RuntimeException("Not a member or pending request"));
        
        // Prevent admin from leaving
        if (member.getRole().equals("ADMIN")) {
            throw new RuntimeException("Quản trị viên không thể rời nhóm. Vui lòng giải tán nhóm nếu bạn muốn đóng nhóm.");
        }

        groupMemberRepository.delete(member);
    }

    @Transactional
    public void disbandGroup(String groupId, String currentUserId) {
        GroupMember admin = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new RuntimeException("No permission"));
        
        if (!admin.getRole().equals("ADMIN")) {
            throw new RuntimeException("Chỉ Quản trị viên mới có quyền giải tán nhóm");
        }

        groupMemberRepository.deleteAll(groupMemberRepository.findByGroupId(groupId));
        groupRepository.deleteById(groupId);
    }

    @Transactional
    public void promoteToModerator(String groupId, String targetUserId, String currentUserId) {
        GroupMember admin = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new RuntimeException("No permission"));
        
        if (!admin.getRole().equals("ADMIN")) {
            throw new RuntimeException("Chỉ Quản trị viên mới có quyền thăng cấp");
        }

        GroupMember targetMember = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new RuntimeException("Target member not found"));

        if (!targetMember.getRole().equals("MEMBER")) {
            throw new RuntimeException("Chỉ có thể thăng cấp cho Member bình thường");
        }

        targetMember.setRole("MODERATOR");
        groupMemberRepository.save(targetMember);
    }

    public boolean isUserInGroup(String groupId, String userId) {
        Optional<GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId);
        return member.isPresent() && (member.get().getRole().equals("ADMIN") || member.get().getRole().equals("MODERATOR") || member.get().getRole().equals("MEMBER"));
    }

    public String getMemberRole(String groupId, String userId) {
        Optional<GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId);
        return member.map(GroupMember::getRole).orElse("NONE");
    }

    public java.util.List<String> getPendingMembers(String groupId, String currentUserId) {
        GroupMember admin = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new RuntimeException("No permission"));
        
        if (!admin.getRole().equals("ADMIN") && !admin.getRole().equals("MODERATOR")) {
            throw new RuntimeException("No permission");
        }

        return groupMemberRepository.findByGroupIdAndRole(groupId, "PENDING")
                .stream()
                .map(GroupMember::getUserId)
                .collect(java.util.stream.Collectors.toList());
    }

    public java.util.List<GroupMemberResponse> getActiveMembers(String groupId, String currentUserId) {
        // Must be at least a member to view members
        GroupMember currentMember = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new RuntimeException("No permission"));
        if (currentMember.getRole().equals("PENDING")) {
            throw new RuntimeException("No permission");
        }

        return groupMemberRepository.findByGroupId(groupId).stream()
                .filter(m -> !m.getRole().equals("PENDING"))
                .map(m -> new GroupMemberResponse(m.getUserId(), m.getRole()))
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void kickMember(String groupId, String targetUserId, String currentUserId) {
        GroupMember currentMember = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new RuntimeException("No permission"));
        
        GroupMember targetMember = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new RuntimeException("Target member not found"));
        
        String curRole = currentMember.getRole();
        String tarRole = targetMember.getRole();

        if (!curRole.equals("ADMIN") && !curRole.equals("MODERATOR")) {
            throw new RuntimeException("No permission to kick");
        }

        if (curRole.equals("MODERATOR") && (tarRole.equals("ADMIN") || tarRole.equals("MODERATOR"))) {
            throw new RuntimeException("Moderator cannot kick Admin or another Moderator");
        }

        if (curRole.equals("ADMIN") && tarRole.equals("ADMIN")) {
            throw new RuntimeException("Admin cannot kick another Admin");
        }

        groupMemberRepository.delete(targetMember);
    }

    public java.util.List<GroupResponse> getMyGroups(String userId) {
        java.util.List<GroupMember> members = groupMemberRepository.findByUserId(userId);
        return members.stream()
                .map(m -> groupRepository.findById(m.getGroupId()))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .map(groupMapper::toGroupResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    public java.util.List<GroupResponse> getAllGroups() {
        return groupRepository.findAll().stream()
                .map(groupMapper::toGroupResponse)
                .collect(java.util.stream.Collectors.toList());
    }
}
