package com.DuyHao.identify_service.service;

import com.DuyHao.identify_service.dto.request.PermissionRequest;
import com.DuyHao.identify_service.dto.request.RoleRequest;
import com.DuyHao.identify_service.dto.response.PermissionResponse;
import com.DuyHao.identify_service.dto.response.RoleResponse;
import com.DuyHao.identify_service.entity.Permission;
import com.DuyHao.identify_service.entity.Role;
import com.DuyHao.identify_service.mapper.PermissionMapper;
import com.DuyHao.identify_service.mapper.RoleMapper;
import com.DuyHao.identify_service.repository.PermissionRepository;
import com.DuyHao.identify_service.repository.RoleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoleService {
    RoleRepository roleRepository;
    PermissionRepository permissionRepository;
    RoleMapper roleMapper;

    public RoleResponse create(RoleRequest request){
        var role = roleMapper.toRole(request);

        var permissions = permissionRepository.findAllById(request.getPermissions());

        role.setPermissions(new HashSet<>(permissions));

        role = roleRepository.save(role);
        return roleMapper.toRoleResponse(role);
    }


    public List<RoleResponse> getAll(){
        var roles = roleRepository.findAll();

        return roles.stream().map(roleMapper::toRoleResponse).toList();
    }

    public void delete(String role){
        roleRepository.deleteById(role);
    }
}
