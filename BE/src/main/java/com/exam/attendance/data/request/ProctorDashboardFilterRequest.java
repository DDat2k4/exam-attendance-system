package com.exam.attendance.data.request;

import com.exam.attendance.data.pojo.ExamSessionStatus;
import com.exam.attendance.data.pojo.RiskLevel;
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