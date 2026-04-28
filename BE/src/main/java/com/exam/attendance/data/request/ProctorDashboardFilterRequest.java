package com.exam.attendance.data.request;

import com.exam.attendance.data.pojo.enums.ExamSessionStatus;
import lombok.Data;

@Data
public class ProctorDashboardFilterRequest {
    private Long roomId;
    private ExamSessionStatus status;
    private Boolean flagged;
    private String keyword; // studentName / citizenId
    private Integer page = 0;
    private Integer size = 20;
}