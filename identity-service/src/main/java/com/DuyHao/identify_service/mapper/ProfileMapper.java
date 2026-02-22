package com.DuyHao.identify_service.mapper;

import com.DuyHao.identify_service.dto.request.ProfileCreationRequest;
import com.DuyHao.identify_service.dto.request.UserCreationRequest;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ProfileMapper {
    ProfileCreationRequest toProfileCreationRequest(UserCreationRequest userCreationRequest);
}
