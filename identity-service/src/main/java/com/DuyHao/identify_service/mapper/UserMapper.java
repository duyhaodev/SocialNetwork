package com.DuyHao.identify_service.mapper;

import com.DuyHao.identify_service.dto.request.UserCreationRequest;
import com.DuyHao.identify_service.dto.request.UserUpdateRequest;
import com.DuyHao.identify_service.dto.response.UserResponse;
import com.DuyHao.identify_service.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UserMapper {
    User toUser(UserCreationRequest request);
    UserResponse toUserResponse(User user);

    @Mapping(target = "roles", ignore = true)
    void updateUser(@MappingTarget User user, UserUpdateRequest request);
}
