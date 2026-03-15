package com.DuyHao.notification_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActivityUserResponse {
    private String id;
    private String username;
    private String displayName;
    private String avatar;
    private Boolean followed;
}
