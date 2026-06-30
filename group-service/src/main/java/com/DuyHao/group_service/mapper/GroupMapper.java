package com.DuyHao.group_service.mapper;

import com.DuyHao.group_service.dto.request.GroupCreateRequest;
import com.DuyHao.group_service.dto.response.GroupResponse;
import com.DuyHao.group_service.entity.Group;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface GroupMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Group toGroup(GroupCreateRequest request);

    GroupResponse toGroupResponse(Group group);
}
