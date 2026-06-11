package com.exam.attendance.data.response;

import com.exam.attendance.data.enums.AttendanceStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class AttendanceSessionResponse {

    private Long id;
    private LocalDateTime checkinTime;
    private String attendancePhoto;
    private String cccdPhoto;
    private Double confidence;
    private String reviewNote;
    private AttendanceStatus status;
    private LocalDateTime verifiedAt;
    private Long sessionId;
    private Long verifiedById;
    private String verifiedByName;
    private String studentName;
    private String citizenId;
}
