package com.DuyHao.identify_service.mapper;

import com.DuyHao.identify_service.dto.request.PermissionRequest;
import com.DuyHao.identify_service.dto.request.UserCreationRequest;
import com.DuyHao.identify_service.dto.request.UserUpdateRequest;
import com.DuyHao.identify_service.dto.response.PermissionResponse;
import com.DuyHao.identify_service.dto.response.UserResponse;
import com.DuyHao.identify_service.entity.Permission;
import com.DuyHao.identify_service.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface PermissionMapper {
    Permission toPermission(PermissionRequest request);

    PermissionResponse toPermissionResponse(Permission permission);
}
