package com.DuyHao.identify_service.mapper;

import com.DuyHao.identify_service.dto.request.PermissionRequest;
import com.DuyHao.identify_service.dto.request.RoleRequest;
import com.DuyHao.identify_service.dto.response.PermissionResponse;
import com.DuyHao.identify_service.dto.response.RoleResponse;
import com.DuyHao.identify_service.entity.Permission;
import com.DuyHao.identify_service.entity.Role;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RoleMapper {

    @Mapping(target = "permissions", ignore = true)
    Role toRole(RoleRequest request);

    RoleResponse toRoleResponse(Role role);
}
