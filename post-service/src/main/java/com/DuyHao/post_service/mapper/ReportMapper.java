package com.DuyHao.post_service.mapper;

import com.DuyHao.post_service.dto.request.ReportRequest;
import com.DuyHao.post_service.dto.response.ReportResponse;
import com.DuyHao.post_service.entity.Report;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ReportMapper {
    Report toReport(ReportRequest request);

    ReportResponse toReportResponse(Report report);
}
