package com.DuyHao.identify_service.event;

import com.DuyHao.identify_service.entity.User;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserRegistrationEvent {
    User user;
}
