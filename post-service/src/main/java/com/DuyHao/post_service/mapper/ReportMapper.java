package com.DuyHao.post_service.mapper;

import com.DuyHao.post_service.dto.request.ReportRequest;
import com.DuyHao.post_service.dto.response.ReportResponse;
import com.DuyHao.post_service.entity.Report;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ReportMapper {
    Report toReport(ReportRequest request);

    @Mapping(target = "id", source = "report.id")
    @Mapping(target = "reporterId", source = "report.reporterId")
    @Mapping(target = "targetType", source = "report.targetType")
    @Mapping(target = "targetId", source = "report.targetId")
    @Mapping(target = "reason", source = "report.reason")
    @Mapping(target = "status", source = "report.status")
    @Mapping(target = "createdAt", source = "report.createdAt")
    // Map User Info
    @Mapping(target = "reporterName", source = "user.fullName")
    @Mapping(target = "reporterAvatar", source = "user.avatarUrl")
    // Map Post Info
    @Mapping(target = "postContent", source = "post.content")
    @Mapping(target = "postMediaUrls", source = "mediaUrls")
    ReportResponse toReportResponse(
            Report report,
            com.DuyHao.post_service.dto.response.UserResponse user,
            com.DuyHao.post_service.entity.Post post,
            java.util.List<String> mediaUrls);
}
