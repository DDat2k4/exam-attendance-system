package com.exam.attendance.data.pojo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
public class ProctorDashboardDTO {

    private Long sessionId;

    private Long userId;
    private String studentName;
    private String citizenId;

    private String roomCode;

    private AttendanceStatus attendanceStatus;
    private Boolean flagged;
    private RiskLevel riskLevel;

    private Double lastConfidence;
    private LocalDateTime lastVerifyTime;

    private String deviceId;

    private Integer attemptNo;
    private Long lastVerifyId;
    private String captureImageUrl;

    private ExamSessionStatus examSessionStatus;

    public ProctorDashboardDTO(
            Long sessionId,
            Long userId,
            String studentName,
            String citizenId,
            String roomCode,
            AttendanceStatus attendanceStatus,
            Boolean flagged,
            RiskLevel riskLevel,
            Double lastConfidence,
            LocalDateTime lastVerifyTime,
            String deviceId,
            Integer attemptNo,
            Long lastVerifyId,
            String captureImageUrl,
            ExamSessionStatus examSessionStatus
    ) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.studentName = studentName;
        this.citizenId = citizenId;
        this.roomCode = roomCode;
        this.attendanceStatus = attendanceStatus;
        this.flagged = flagged;
        this.riskLevel = riskLevel;
        this.lastConfidence = lastConfidence;
        this.lastVerifyTime = lastVerifyTime;
        this.deviceId = deviceId;
        this.attemptNo = attemptNo;
        this.lastVerifyId = lastVerifyId;
        this.captureImageUrl = captureImageUrl;
        this.examSessionStatus = examSessionStatus;
    }
}
